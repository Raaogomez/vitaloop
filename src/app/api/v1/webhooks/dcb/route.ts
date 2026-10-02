import { db } from "@/db";
import { webhookEvents, dcbSubscriptions, dcbTransactions, dcbPlans } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { withApi } from "@/server/http";
import { ok } from "@/server/errors";
import { webhookSchema, parseOrThrow } from "@/server/validation";
import { verifyWebhookSignature } from "@/server/auth";
import { normalizeMsisdn } from "@/lib/dcb";
import { audit } from "@/server/services/audit";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

// Telco/aggregator callbacks: charge confirmations, STOPs, refunds.
// Idempotent on providerRef. HMAC optional in simulator, enforced with TELCO_WEBHOOK_SECRET.
export const POST = withApi(async ({ req }) => {
  const raw = await req.text();
  let json: unknown = null;
  try { json = JSON.parse(raw); } catch { /* validated below */ }
  const body = parseOrThrow(webhookSchema, json);

  const sig = req.headers.get("x-telco-signature");
  const enforce = !!process.env.TELCO_WEBHOOK_SECRET;
  if (enforce && !verifyWebhookSignature(raw, sig)) {
    logger.warn("webhook", "invalid signature", { ref: body.providerRef });
    await db.insert(webhookEvents).values({
      provider: body.operator || "telco", event: body.event, providerRef: body.providerRef,
      msisdn: body.msisdn, status: "rejected", payload: { reason: "bad-signature" },
    });
    return ok({ received: true, applied: false, reason: "bad-signature" });
  }

  const dup = (await db.select().from(webhookEvents).where(eq(webhookEvents.providerRef, body.providerRef)))[0];
  if (dup) return ok({ received: true, applied: false, reason: "duplicate", eventId: dup.id });

  const [evt] = await db.insert(webhookEvents).values({
    provider: body.operator || "telco", event: body.event, providerRef: body.providerRef,
    msisdn: normalizeMsisdn(body.msisdn), status: "received", payload: body as unknown as Record<string, unknown>,
  }).returning();

  const msisdn = normalizeMsisdn(body.msisdn);
  let applied = "none";

  if (body.event === "charge.confirmed") {
    await db.execute(sql`update dcb_subscriptions set status='active',
      next_billing_at = coalesce(next_billing_at, now()) where msisdn=${msisdn} and status in ('pending','failed')`);
    await db.insert(dcbTransactions).values({
      msisdn, operator: body.operator || "telco", type: "charge",
      amountMinor: body.amountMinor ?? 0, currency: "NGN", status: "success",
      providerRef: body.providerRef, note: "Confirmed via telco webhook.",
    });
    applied = "activated";
  } else if (body.event === "charge.failed") {
    await db.insert(dcbTransactions).values({
      msisdn, operator: body.operator || "telco", type: "charge",
      amountMinor: body.amountMinor ?? 0, currency: "NGN", status: "failed",
      providerRef: body.providerRef, errorCode: body.errorCode, note: "Failed via telco webhook.",
    });
    applied = "logged-failure";
  } else if (body.event === "subscription.stopped" || body.event === "consent.revoked") {
    await db.execute(sql`update dcb_subscriptions set status='cancelled', ended_at=now()
      where msisdn=${msisdn} and status='active'`);
    applied = "cancelled";
  } else if (body.event === "refund.issued") {
    const plans = await db.select().from(dcbPlans).limit(1);
    void plans;
    await db.insert(dcbTransactions).values({
      msisdn, operator: body.operator || "telco", type: "refund",
      amountMinor: body.amountMinor ?? 0, currency: "NGN", status: "success",
      providerRef: body.providerRef, note: "Refund issued via telco webhook.",
    });
    applied = "refunded";
  }

  await db.execute(sql`update webhook_events set status='applied' where id=${evt.id}`);
  const sub = (await db.execute(sql`select id from subscribers where msisdn=${msisdn}`) as unknown as { rows: { id: number }[] }).rows[0];
  await audit(sub?.id ?? null, `webhook.${body.event}`, { providerRef: body.providerRef, applied }, "telco");

  return ok({ received: true, applied, eventId: evt.id });
}, { scope: "v1-webhook" });

export const GET = withApi(async () => {
  const { desc } = await import("drizzle-orm");
  const rows = await db.select().from(webhookEvents).orderBy(desc(webhookEvents.createdAt)).limit(50);
  return ok({ events: rows });
}, { scope: "v1-webhook" });
