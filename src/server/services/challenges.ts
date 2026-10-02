// ── Challenge service ──
import { db } from "@/db";
import { challenges, challengeEnrollments, wellnessLogs } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { notFound } from "../errors";
import { audit } from "./audit";

export async function listChallenges() {
  return db.select().from(challenges);
}

export async function join(challengeId: number, subscriberId: number) {
  const existing = await db.select().from(challengeEnrollments)
    .where(eq(challengeEnrollments.subscriberId, subscriberId));
  const already = existing.find((e) => e.challengeId === challengeId);
  if (already) return { enrollment: already, alreadyJoined: true };
  const [row] = await db.insert(challengeEnrollments)
    .values({ challengeId, subscriberId, progress: 0, verifiedProgress: 0 }).returning();
  await db.execute(sql`update challenges set participants = participants + 1 where id = ${challengeId}`);
  await audit(subscriberId, "challenge.joined", { challengeId });
  return { enrollment: row, alreadyJoined: false };
}

export async function progress(subscriberId: number) {
  const enrolls = await db.select().from(challengeEnrollments)
    .where(eq(challengeEnrollments.subscriberId, subscriberId)).orderBy(desc(challengeEnrollments.joinedAt));
  const all = await db.select().from(challenges);
  const map = new Map(all.map((c) => [c.id, c]));
  return enrolls.map((e) => {
    const c = map.get(e.challengeId);
    if (!c) throw notFound("Challenge missing");
    const pct = Math.min(100, Math.round(((e.verifiedProgress ?? 0) / Math.max(1, c.targetPoints)) * 100));
    return { ...e, challenge: c, pct };
  });
}

// Settlement job: mark completed enrollments; returns count
export async function settleChallenges() {
  const res = await db.execute(sql`
    update challenge_enrollments e set completed = true
    from challenges c where e.challenge_id = c.id
    and e.completed = false and e.verified_progress >= c.target_points`);
  return { settled: (res as unknown as { rowCount?: number }).rowCount ?? 0 };
}

export async function verifiedWeek(subscriberId: number) {
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const logs = await db.select().from(wellnessLogs).where(eq(wellnessLogs.subscriberId, subscriberId));
  return logs.filter((l) => new Date(l.loggedAt) >= weekAgo).reduce((s, l) => s + (l.verifiedPoints ?? 0), 0);
}
