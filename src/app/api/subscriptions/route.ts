import { db } from "@/db";
import { dcbSubscriptions, dcbTransactions, dcbPlans, subscribers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { normalizeMsisdn, detectOperator, generateRef, simulateCharge } from "@/lib/dcb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const msisdn = searchParams.get("msisdn");
  if (!msisdn) {
    const rows = await db.select().from(dcbSubscriptions).orderBy(desc(dcbSubscriptions.startedAt));
    return Response.json({ ok: true, subscriptions: rows });
  }
  const rows = await db
    .select()
    .from(dcbSubscriptions)
    .where(eq(dcbSubscriptions.msisdn, msisdn))
    .orderBy(desc(dcbSubscriptions.startedAt));
  const plans = await db.select().from(dcbPlans);
  const map = new Map(plans.map((p) => [p.id, p]));
  return Response.json({ ok: true, subscriptions: rows.map((r) => ({ ...r, plan: map.get(r.planId) ?? null })) });
}

// Subscribe (DCB charge attempt)
export async function POST(req: Request) {
  const body = await req.json();
  const { msisdn: raw, planCode, consentRef, heVerified, pinVerified } = body as {
    msisdn: string; planCode: string; consentRef?: string; heVerified?: boolean; pinVerified?: boolean;
  };
  if (!raw || !planCode) return Response.json({ ok: false, error: "msisdn and planCode required" }, { status: 400 });

  const msisdn = normalizeMsisdn(raw);
  const operator = detectOperator(msisdn);
  const plans = await db.select().from(dcbPlans).where(eq(dcbPlans.code, planCode));
  const plan = plans[0];
  if (!plan) return Response.json({ ok: false, error: "plan not found" }, { status: 404 });

  // ensure subscriber exists
  let sub = (await db.select().from(subscribers).where(eq(subscribers.msisdn, msisdn)))[0];
  if (!sub) {
    [sub] = await db.insert(subscribers).values({ msisdn, operator }).returning();
  }

  const txId = generateRef("VL");
  const sim = simulateCharge({ msisdn, amountMinor: plan.priceMinor, operator });

  const nextBilling = new Date(Date.now() + plan.validityDays * 86400000);
  const [subscription] = await db
    .insert(dcbSubscriptions)
    .values({
      subscriberId: sub.id,
      planId: plan.id,
      msisdn,
      operator,
      status: sim.ok ? "active" : "failed",
      consentRef: consentRef || generateRef("CONSENT"),
      heVerified: !!heVerified,
      pinVerified: !!pinVerified,
      transactionId: txId,
      renewals: 0,
      nextBillingAt: sim.ok ? nextBilling : null,
    })
    .returning();

  await db.insert(dcbTransactions).values({
    subscriptionId: subscription.id,
    msisdn,
    operator,
    type: "charge",
    amountMinor: plan.priceMinor,
    currency: plan.currency,
    status: sim.ok ? "success" : "failed",
    providerRef: txId,
    errorCode: sim.errorCode,
    note: sim.note,
  });

  // airtime cashback bonus transaction on success
  if (sim.ok && plan.airtimeCashbackPct > 0) {
    const bonus = Math.round((plan.priceMinor * plan.airtimeCashbackPct) / 100);
    await db.insert(dcbTransactions).values({
      subscriptionId: subscription.id,
      msisdn,
      operator,
      type: "bonus",
      amountMinor: bonus,
      currency: plan.currency,
      status: "success",
      providerRef: generateRef("CASHBACK"),
      note: `Wellness cashback ${plan.airtimeCashbackPct}% credited as airtime.`,
    });
  }

  return Response.json({
    ok: sim.ok,
    subscription: { ...subscription, plan },
    errorCode: sim.errorCode,
    note: sim.note,
    subscriber: sub,
  });
}

// Cancel / renew
export async function PATCH(req: Request) {
  const body = await req.json();
  const { subscriptionId, action } = body as { subscriptionId: number; action: "cancel" | "renew" };
  if (!subscriptionId || !action) return Response.json({ ok: false, error: "subscriptionId and action required" }, { status: 400 });
  const [sub] = await db.select().from(dcbSubscriptions).where(eq(dcbSubscriptions.id, subscriptionId));
  if (!sub) return Response.json({ ok: false, error: "not found" }, { status: 404 });

  if (action === "cancel") {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`update dcb_subscriptions set status='cancelled', ended_at=now() where id=${subscriptionId}`);
    return Response.json({ ok: true, status: "cancelled" });
  }
  if (action === "renew") {
    const [plan] = await db.select().from(dcbPlans).where(eq(dcbPlans.id, sub.planId));
    const sim = simulateCharge({ msisdn: sub.msisdn, amountMinor: plan?.priceMinor ?? 0, operator: sub.operator });
    const { sql } = await import("drizzle-orm");
    if (sim.ok) {
      await db.execute(sql`update dcb_subscriptions set status='active', renewals=renewals+1, next_billing_at = now() + (${plan?.validityDays ?? 7} || ' days')::interval where id=${subscriptionId}`);
      await db.insert(dcbTransactions).values({
        subscriptionId, msisdn: sub.msisdn, operator: sub.operator, type: "charge",
        amountMinor: plan?.priceMinor ?? 0, currency: plan?.currency ?? "NGN",
        status: "success", providerRef: generateRef("VL"), note: "Scheduled renewal charge successful.",
      });
      return Response.json({ ok: true, status: "active" });
    }
    await db.insert(dcbTransactions).values({
      subscriptionId, msisdn: sub.msisdn, operator: sub.operator, type: "charge",
      amountMinor: plan?.priceMinor ?? 0, currency: plan?.currency ?? "NGN",
      status: "failed", providerRef: generateRef("VL"), errorCode: sim.errorCode, note: sim.note,
    });
    return Response.json({ ok: false, status: "failed", errorCode: sim.errorCode });
  }
  return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
}
