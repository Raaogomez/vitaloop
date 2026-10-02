// ── Billing service: DCB subscribe / renew / stop / ledger ──
import { db } from "@/db";
import { dcbPlans, dcbSubscriptions, dcbTransactions, subscribers } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { normalizeMsisdn, detectOperator, generateRef, simulateCharge } from "@/lib/dcb";
import { badRequest, notFound } from "../errors";
import { audit } from "./audit";

export async function listPlans() {
  return db.select().from(dcbPlans);
}

export async function ensureSubscriber(msisdnRaw: string, displayName?: string) {
  const msisdn = normalizeMsisdn(msisdnRaw);
  const operator = detectOperator(msisdn);
  const found = (await db.select().from(subscribers).where(eq(subscribers.msisdn, msisdn)))[0];
  if (found) return found;
  const [row] = await db.insert(subscribers).values({ msisdn, operator, displayName: displayName || null }).returning();
  return row;
}

export async function subscribe(opts: {
  msisdnRaw: string; planCode: string; heVerified?: boolean; pinVerified?: boolean; consentRef?: string;
}) {
  const msisdn = normalizeMsisdn(opts.msisdnRaw);
  if (!msisdn) throw badRequest("Invalid MSISDN");
  const operator = detectOperator(msisdn);
  const plan = (await db.select().from(dcbPlans).where(eq(dcbPlans.code, opts.planCode)))[0];
  if (!plan) throw notFound(`Plan ${opts.planCode} not found`);
  const sub = await ensureSubscriber(msisdn);

  const txId = generateRef("VL");
  const sim = simulateCharge({ msisdn, amountMinor: plan.priceMinor, operator });
  const nextBilling = new Date(Date.now() + plan.validityDays * 86400000);

  const [subscription] = await db.insert(dcbSubscriptions).values({
    subscriberId: sub.id,
    planId: plan.id,
    msisdn, operator,
    status: sim.ok ? "active" : "failed",
    consentRef: opts.consentRef || generateRef("CONSENT"),
    heVerified: !!opts.heVerified,
    pinVerified: !!opts.pinVerified,
    transactionId: txId,
    renewals: 0,
    nextBillingAt: sim.ok ? nextBilling : null,
  }).returning();

  await db.insert(dcbTransactions).values({
    subscriptionId: subscription.id, msisdn, operator, type: "charge",
    amountMinor: plan.priceMinor, currency: plan.currency,
    status: sim.ok ? "success" : "failed",
    providerRef: txId, errorCode: sim.errorCode, note: sim.note,
  });

  if (sim.ok && plan.airtimeCashbackPct > 0) {
    const bonus = Math.round((plan.priceMinor * plan.airtimeCashbackPct) / 100);
    await db.insert(dcbTransactions).values({
      subscriptionId: subscription.id, msisdn, operator, type: "bonus",
      amountMinor: bonus, currency: plan.currency, status: "success",
      providerRef: generateRef("CASHBACK"),
      note: `Wellness cashback ${plan.airtimeCashbackPct}% credited as airtime.`,
    });
  }

  await audit(sub.id, sim.ok ? "subscription.activated" : "subscription.failed", {
    planCode: plan.code, operator, txId, errorCode: sim.errorCode,
  });

  return { subscription: { ...subscription, plan }, subscriber: sub, ok: sim.ok, errorCode: sim.errorCode, note: sim.note };
}

export async function subscriptionHistory(msisdnRaw: string) {
  const msisdn = normalizeMsisdn(msisdnRaw);
  const rows = await db.select().from(dcbSubscriptions)
    .where(eq(dcbSubscriptions.msisdn, msisdn)).orderBy(desc(dcbSubscriptions.startedAt));
  const plans = await db.select().from(dcbPlans);
  const map = new Map(plans.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, plan: map.get(r.planId) ?? null }));
}

export async function cancelSubscription(subscriptionId: number) {
  const [sub] = await db.select().from(dcbSubscriptions).where(eq(dcbSubscriptions.id, subscriptionId));
  if (!sub) throw notFound("Subscription not found");
  await db.execute(sql`update dcb_subscriptions set status='cancelled', ended_at=now() where id=${subscriptionId}`);
  await audit(sub.subscriberId, "subscription.cancelled", { subscriptionId });
  return { status: "cancelled" };
}

export async function renewSubscription(subscriptionId: number) {
  const [sub] = await db.select().from(dcbSubscriptions).where(eq(dcbSubscriptions.id, subscriptionId));
  if (!sub) throw notFound("Subscription not found");
  const [plan] = await db.select().from(dcbPlans).where(eq(dcbPlans.id, sub.planId));
  const sim = simulateCharge({ msisdn: sub.msisdn, amountMinor: plan?.priceMinor ?? 0, operator: sub.operator });
  if (sim.ok) {
    await db.execute(sql`update dcb_subscriptions set status='active', renewals=renewals+1,
      next_billing_at = now() + (${plan?.validityDays ?? 7} || ' days')::interval where id=${subscriptionId}`);
    await db.insert(dcbTransactions).values({
      subscriptionId, msisdn: sub.msisdn, operator: sub.operator, type: "charge",
      amountMinor: plan?.priceMinor ?? 0, currency: plan?.currency ?? "NGN",
      status: "success", providerRef: generateRef("VL"), note: "Scheduled renewal charge successful.",
    });
    await audit(sub.subscriberId, "subscription.renewed", { subscriptionId });
    return { ok: true, status: "active" };
  }
  await db.insert(dcbTransactions).values({
    subscriptionId, msisdn: sub.msisdn, operator: sub.operator, type: "charge",
    amountMinor: plan?.priceMinor ?? 0, currency: plan?.currency ?? "NGN",
    status: "failed", providerRef: generateRef("VL"), errorCode: sim.errorCode, note: sim.note,
  });
  return { ok: false, status: "failed", errorCode: sim.errorCode };
}

// Renewal job: charge every active sub whose nextBillingAt passed
export async function runRenewals(limit = 200) {
  const due = await db.execute(sql`select id from dcb_subscriptions
    where status='active' and next_billing_at is not null and next_billing_at <= now()
    order by next_billing_at asc limit ${limit}`);
  const rows = (due as unknown as { rows: { id: number }[] }).rows;
  let ok = 0, failed = 0;
  for (const r of rows) {
    try {
      const res = await renewSubscription(r.id);
      if ((res as { ok?: boolean }).ok) ok++; else failed++;
    } catch { failed++; }
  }
  return { due: rows.length, ok, failed };
}
