// ── Wellness service: activities, logs, scoring ──
import { db } from "@/db";
import { wellnessActivities, wellnessLogs, challengeEnrollments, subscribers } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { screenLog, LEVEL_META } from "@/lib/verification";
import { badRequest, notFound } from "../errors";
import { audit } from "./audit";

export async function listActivities() {
  return db.select().from(wellnessActivities);
}

export async function listLogs(subscriberId: number, limit = 100) {
  const logs = await db.select().from(wellnessLogs)
    .where(eq(wellnessLogs.subscriberId, subscriberId))
    .orderBy(desc(wellnessLogs.loggedAt)).limit(limit);
  const acts = await db.select().from(wellnessActivities);
  const map = new Map(acts.map((a) => [a.id, a]));
  return logs.map((l) => ({ ...l, activity: map.get(l.activityId) ?? null }));
}

export async function createLog(opts: {
  subscriberId: number; activityId?: number; activityKey?: string;
  quantity: number; mood?: string; note?: string; loggedAt?: string;
}) {
  if (!opts.subscriberId || !opts.quantity) throw badRequest("subscriberId and quantity required");
  const acts = await db.select().from(wellnessActivities);
  const act = opts.activityId
    ? acts.find((a) => a.id === opts.activityId)
    : acts.find((a) => a.key === opts.activityKey);
  if (!act) throw notFound("Activity not found");

  const [sub] = await db.select().from(subscribers).where(eq(subscribers.id, opts.subscriberId));
  if (!sub) throw notFound("Subscriber not found");

  const now = opts.loggedAt ? new Date(opts.loggedAt) : new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const recent = await db.select().from(wellnessLogs)
    .where(eq(wellnessLogs.subscriberId, opts.subscriberId)).orderBy(desc(wellnessLogs.loggedAt));
  const todayLogs = recent.filter((l) => new Date(l.loggedAt) >= todayStart);
  const sameToday = todayLogs.filter((l) => l.activityId === act.id);
  const todayQtySame = sameToday.reduce((s, l) => s + l.quantity, 0);
  const activeIds = new Set(acts.filter((a) => ["Move", "Strength"].includes(a.category) && a.unit === "min").map((a) => a.id));
  const todayActive = todayLogs.filter((l) => activeIds.has(l.activityId)).reduce((s, l) => s + l.quantity, 0);
  const lastHour = recent.filter((l) => now.getTime() - new Date(l.loggedAt).getTime() < 3600000).length;
  const accountAgeDays = sub.createdAt ? Math.max(0, (now.getTime() - new Date(sub.createdAt).getTime()) / 86400000) : 0;
  const dayOnePts = accountAgeDays <= 1 ? recent.reduce((s, l) => s + l.pointsEarned, 0) : 0;

  const screening = screenLog({
    activityKey: act.key,
    quantity: Number(opts.quantity),
    now,
    todayQtySameActivity: todayQtySame,
    todayActiveMinutes: todayActive,
    logsLastHour: lastHour,
    lastLogAtSameActivity: sameToday[0]?.loggedAt ? new Date(sameToday[0].loggedAt) : null,
    firstDayPoints: dayOnePts,
    accountAgeDays,
    recentQuantities: recent.slice(0, 10).map((l) => l.quantity).reverse(),
  });

  const points = Math.round(act.pointsPerUnit * Number(opts.quantity));
  const calories = Math.round(act.caloriesPerUnit * Number(opts.quantity) * 10) / 10;
  const verifiedPoints = screening.passed ? Math.round(points * LEVEL_META[screening.level].challengeWeight) : 0;

  const [row] = await db.insert(wellnessLogs).values({
    subscriberId: opts.subscriberId,
    activityId: act.id,
    quantity: Number(opts.quantity),
    pointsEarned: points,
    calories,
    mood: opts.mood || null,
    note: opts.note || null,
    loggedAt: now,
    verificationLevel: screening.level,
    verificationMethod: screening.passed ? "auto-checks" : "self",
    verifiedPoints,
    flagged: !screening.passed,
    flagCodes: screening.flags.map((f) => f.code),
    flagReason: screening.flags.map((f) => f.message).join(" | ") || null,
  }).returning();

  await db.execute(sql`update subscribers set trust_score = greatest(0, least(100, trust_score + ${screening.passed ? 1 : -8})),
    flagged_logs = flagged_logs + ${screening.passed ? 0 : 1} where id = ${opts.subscriberId}`);
  await db.execute(sql`update challenge_enrollments set verified_progress = verified_progress + ${verifiedPoints},
    progress = progress + ${points} where subscriber_id = ${opts.subscriberId}`);

  await audit(opts.subscriberId, screening.passed ? "log.created" : "log.flagged", {
    activityKey: act.key, quantity: opts.quantity, points, level: screening.level,
  });

  return { log: { ...row, activity: act }, screening };
}
