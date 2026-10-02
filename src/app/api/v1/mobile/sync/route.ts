import { db } from "@/db";
import { idempotencyKeys, subscribers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withApi, readJson, clientIp } from "@/server/http";
import { ok, badRequest } from "@/server/errors";
import { mobileSyncSchema, parseOrThrow } from "@/server/validation";
import { bearer, verifySession } from "@/server/auth";
import { createLog } from "@/server/services/wellness";
import { attachEvidence } from "@/server/services/verification";
import { ingest } from "@/server/services/health";
import { normalizeMsisdn } from "@/lib/dcb";

export const dynamic = "force-dynamic";

// Offline-first replay: queued logs (+evidence) and sensor rows, idempotent by clientId
export const POST = withApi(async ({ req }) => {
  const idemKey = req.headers.get("x-idempotency-key");
  if (idemKey) {
    const hit = (await db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, idemKey)))[0];
    if (hit?.response) return ok({ ...(hit.response as object), replayed: true });
  }

  const body = parseOrThrow(mobileSyncSchema, await readJson(req));

  // resolve subscriber: session > subscriberId > msisdn
  let subscriberId = body.subscriberId ?? null;
  const sess = verifySession(bearer(req));
  if (sess) subscriberId = sess.subscriberId;
  if (!subscriberId && body.msisdn) {
    const msisdn = normalizeMsisdn(body.msisdn);
    const [s] = await db.select().from(subscribers).where(eq(subscribers.msisdn, msisdn));
    if (!s) throw badRequest("Unknown msisdn — call bootstrap first");
    subscriberId = s.id;
  }
  if (!subscriberId) throw badRequest("subscriberId, msisdn or session required");

  const seen = new Set<string>();
  const results: { clientId: string; status: string; logId?: number; level?: string; error?: string }[] = [];
  let accepted = 0, flagged = 0;

  for (const item of (body.logs || []).slice(0, 200)) {
    if (seen.has(item.clientId)) {
      results.push({ clientId: item.clientId, status: "duplicate" });
      continue;
    }
    seen.add(item.clientId);
    try {
      const { log, screening } = await createLog({
        subscriberId,
        activityId: item.activityId,
        activityKey: item.activityKey,
        quantity: item.quantity,
        mood: item.mood,
        note: item.note ? `[${item.clientId}] ${item.note}` : `[client:${item.clientId}]`,
        loggedAt: item.loggedAt,
      });
      if (item.evidence?.length) {
        for (const ev of item.evidence.slice(0, 4)) {
          try {
            await attachEvidence({
              logId: log.id, subscriberId, method: ev.method,
              detail: ev.detail, witnessMsisdn: ev.witnessMsisdn,
            });
          } catch { /* per-evidence failure shouldn't fail sync */ }
        }
      }
      if (screening.passed) accepted++; else flagged++;
      results.push({ clientId: item.clientId, status: screening.passed ? "accepted" : "flagged", logId: log.id, level: screening.level });
    } catch (e) {
      results.push({ clientId: item.clientId, status: "error", error: e instanceof Error ? e.message : "failed" });
    }
  }

  let health = null;
  if (body.healthRecords?.length) {
    try {
      health = await ingest(subscriberId, body.healthRecords.map((r) => ({
        recordType: r.recordType, value: r.value, unit: r.unit,
        startTime: r.startTime, endTime: r.endTime,
        sourceApp: r.sourceApp, raw: (r.raw as Record<string, unknown>) || {},
      })));
    } catch (e) {
      health = { error: e instanceof Error ? e.message : "health ingest failed" };
    }
  }

  const payload = {
    subscriberId,
    logs: { received: body.logs?.length || 0, accepted, flagged, results: results.slice(0, 200) },
    health,
    serverTime: new Date().toISOString(),
  };

  if (idemKey && subscriberId) {
    try {
      await db.insert(idempotencyKeys).values({
        key: idemKey, subscriberId, endpoint: "mobile-sync", response: payload,
      });
    } catch { /* concurrent replay — ignore */ }
  }

  return ok(payload);
}, { scope: "v1-sync", rateLimitBy: ({ req }) => clientIp(req) });
