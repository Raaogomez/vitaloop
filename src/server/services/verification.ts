// ── Verification service: evidence upgrades + trust ──
import { db } from "@/db";
import { wellnessLogs, verificationEvidence, subscribers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { LEVEL_META } from "@/lib/verification";
import { badRequest, notFound } from "../errors";
import { audit } from "./audit";

export async function attachEvidence(opts: {
  logId: number; subscriberId: number; method: string; detail: string; witnessMsisdn?: string;
}) {
  if (!opts.logId || !opts.subscriberId || !opts.method || !opts.detail) {
    throw badRequest("logId, subscriberId, method, detail required");
  }
  if (opts.detail.trim().length < 8) throw badRequest("Evidence description too short (min 8 chars).");
  if (opts.method === "peer" && !opts.witnessMsisdn) throw badRequest("Peer witness requires witness phone number.");

  const [log] = await db.select().from(wellnessLogs).where(eq(wellnessLogs.id, opts.logId));
  if (!log || log.subscriberId !== opts.subscriberId) throw notFound("Log not found for subscriber");

  const [ev] = await db.insert(verificationEvidence).values({
    logId: opts.logId, subscriberId: opts.subscriberId, method: opts.method,
    detail: opts.detail.trim(), witnessMsisdn: opts.witnessMsisdn || null, status: "accepted",
  }).returning();

  const existing = await db.select().from(verificationEvidence).where(eq(verificationEvidence.logId, opts.logId));
  const distinct = new Set(existing.map((e) => e.method));
  const newLevel = distinct.size >= 2 ? "certified" : "verified";
  const weight = LEVEL_META[newLevel as keyof typeof LEVEL_META].challengeWeight;
  const newPts = Math.round(log.pointsEarned * weight);
  const delta = newPts - (log.verifiedPoints ?? 0);

  await db.execute(sql`update wellness_logs set verification_level=${newLevel},
    verification_method=${opts.method}, verified_points=${newPts},
    flagged=false, flag_reason=null, evidence_count=${existing.length} where id=${opts.logId}`);
  await db.execute(sql`update subscribers set trust_score=greatest(0, least(100, trust_score + ${newLevel === "certified" ? 4 : 2})),
    verified_logs=verified_logs+1 where id=${opts.subscriberId}`);
  if (delta !== 0) {
    await db.execute(sql`update challenge_enrollments set verified_progress=verified_progress+${delta} where subscriber_id=${opts.subscriberId}`);
  }
  await audit(opts.subscriberId, `log.${newLevel}`, { logId: opts.logId, method: opts.method });
  const [updated] = await db.select().from(wellnessLogs).where(eq(wellnessLogs.id, opts.logId));
  return { evidence: ev, log: updated, newLevel, newVerifiedPoints: newPts };
}

export async function trustSummary(subscriberId: number) {
  const [s] = await db.select().from(subscribers).where(eq(subscribers.id, subscriberId));
  if (!s) throw notFound("Subscriber not found");
  const logs = await db.select().from(wellnessLogs).where(eq(wellnessLogs.subscriberId, subscriberId));
  const verified = logs.filter((l) => l.verificationLevel === "verified" || l.verificationLevel === "certified").length;
  const plausible = logs.filter((l) => l.verificationLevel === "plausible").length;
  const flagged = logs.filter((l) => l.flagged).length;
  return {
    score: s.trustScore ?? 50,
    verified, plausible, flagged, total: logs.length,
    challengePts: logs.reduce((sum, l) => sum + (l.verifiedPoints ?? 0), 0),
    verificationRate: logs.length ? Math.round(((verified + plausible) / logs.length) * 100) : 0,
  };
}
