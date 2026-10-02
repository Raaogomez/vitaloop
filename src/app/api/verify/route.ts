import { db } from "@/db";
import { wellnessLogs, verificationEvidence, subscribers } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { LEVEL_META } from "@/lib/verification";

export const dynamic = "force-dynamic";

// List evidence for a subscriber or log
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subscriberId = searchParams.get("subscriberId");
  const logId = searchParams.get("logId");
  let rows;
  if (logId) {
    rows = await db.select().from(verificationEvidence).where(eq(verificationEvidence.logId, Number(logId))).orderBy(desc(verificationEvidence.createdAt));
  } else if (subscriberId) {
    rows = await db.select().from(verificationEvidence).where(eq(verificationEvidence.subscriberId, Number(subscriberId))).orderBy(desc(verificationEvidence.createdAt));
  } else {
    rows = await db.select().from(verificationEvidence).orderBy(desc(verificationEvidence.createdAt));
  }
  // trust summary
  let trust = null;
  if (subscriberId) {
    const [s] = await db.select().from(subscribers).where(eq(subscribers.id, Number(subscriberId)));
    if (s) {
      const logs = await db.select().from(wellnessLogs).where(eq(wellnessLogs.subscriberId, Number(subscriberId)));
      const verified = logs.filter((l) => l.verificationLevel === "verified" || l.verificationLevel === "certified").length;
      const plausible = logs.filter((l) => l.verificationLevel === "plausible").length;
      const flagged = logs.filter((l) => l.flagged).length;
      const challengePts = logs.reduce((sum, l) => sum + (l.verifiedPoints ?? 0), 0);
      trust = {
        score: s.trustScore ?? 50,
        verified, plausible, flagged,
        total: logs.length,
        challengePts,
        verificationRate: logs.length ? Math.round(((verified + plausible) / logs.length) * 100) : 0,
      };
    }
  }
  return Response.json({ ok: true, evidence: rows.slice(0, 100), trust });
}

// Attach evidence → upgrades log: self/plausible → verified (or certified with 2 methods)
export async function POST(req: Request) {
  const body = await req.json();
  const { logId, subscriberId, method, detail, witnessMsisdn } = body as {
    logId: number; subscriberId: number; method: string; detail: string; witnessMsisdn?: string;
  };
  if (!logId || !subscriberId || !method || !detail) {
    return Response.json({ ok: false, error: "logId, subscriberId, method, detail required" }, { status: 400 });
  }
  const [log] = await db.select().from(wellnessLogs).where(eq(wellnessLogs.id, logId));
  if (!log || log.subscriberId !== subscriberId) {
    return Response.json({ ok: false, error: "log not found for subscriber" }, { status: 404 });
  }

  // Basic evidence quality gate: detail must be meaningful (anti-spam)
  if (detail.trim().length < 8) {
    return Response.json({ ok: false, error: "Evidence description too short — describe what you did (min 8 chars)." }, { status: 400 });
  }
  if (method === "peer" && !witnessMsisdn) {
    return Response.json({ ok: false, error: "Peer witness requires the witness phone number." }, { status: 400 });
  }

  const [ev] = await db.insert(verificationEvidence).values({
    logId, subscriberId, method, detail: detail.trim(), witnessMsisdn: witnessMsisdn || null, status: "accepted",
  }).returning();

  const existing = await db.select().from(verificationEvidence).where(eq(verificationEvidence.logId, logId));
  const distinctMethods = new Set(existing.map((e) => e.method));

  // Upgrade logic:
  // - 1 evidence method → verified (clears flags, restores full challenge points)
  // - 2+ distinct methods → certified (25% bonus)
  const newLevel = distinctMethods.size >= 2 ? "certified" : "verified";
  const weight = LEVEL_META[newLevel as keyof typeof LEVEL_META].challengeWeight;
  const newVerifiedPoints = Math.round(log.pointsEarned * weight);
  const delta = newVerifiedPoints - (log.verifiedPoints ?? 0);

  await db.execute(sql`update wellness_logs set verification_level = ${newLevel},
    verification_method = ${method}, verified_points = ${newVerifiedPoints},
    flagged = false, flag_reason = null, evidence_count = ${existing.length}
    where id = ${logId}`);
  await db.execute(sql`update subscribers set trust_score = greatest(0, least(100, trust_score + ${newLevel === "certified" ? 4 : 2})),
    verified_logs = verified_logs + 1 where id = ${subscriberId}`);
  if (delta !== 0) {
    await db.execute(sql`update challenge_enrollments set verified_progress = verified_progress + ${delta} where subscriber_id = ${subscriberId}`);
  }

  const [updated] = await db.select().from(wellnessLogs).where(eq(wellnessLogs.id, logId));
  return Response.json({ ok: true, evidence: ev, log: updated, newLevel, newVerifiedPoints, trustDelta: newLevel === "certified" ? 4 : 2 });
}
