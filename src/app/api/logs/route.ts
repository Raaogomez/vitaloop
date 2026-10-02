import { db } from "@/db";
import { wellnessLogs, wellnessActivities, subscribers, fraudEvents } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { screenLog, LEVEL_META } from "@/lib/verification";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subscriberId = Number(searchParams.get("subscriberId"));
  if (!subscriberId) return Response.json({ ok: false, error: "subscriberId required" }, { status: 400 });
  const logs = await db
    .select()
    .from(wellnessLogs)
    .where(eq(wellnessLogs.subscriberId, subscriberId))
    .orderBy(desc(wellnessLogs.loggedAt));
  const acts = await db.select().from(wellnessActivities);
  const map = new Map(acts.map((a) => [a.id, a]));
  const enriched = logs.map((l) => ({
    ...l,
    activity: map.get(l.activityId) ?? null,
    levelMeta: LEVEL_META[(l.verificationLevel as keyof typeof LEVEL_META) ?? "self"] ?? LEVEL_META.self,
  }));
  return Response.json({ ok: true, logs: enriched });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { subscriberId, activityId, quantity, steps, mood, note } = body as {
    subscriberId: number; activityId: number; quantity: number; steps?: number; mood?: string; note?: string;
  };
  if (!subscriberId || !activityId || !quantity) {
    return Response.json({ ok: false, error: "subscriberId, activityId, quantity required" }, { status: 400 });
  }
  const [act] = await db.select().from(wellnessActivities).where(eq(wellnessActivities.id, activityId));
  if (!act) return Response.json({ ok: false, error: "activity not found" }, { status: 404 });

  const [sub] = await db.select().from(subscribers).where(eq(subscribers.id, subscriberId));
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  // Gather fraud-screening context
  const recent = await db
    .select()
    .from(wellnessLogs)
    .where(eq(wellnessLogs.subscriberId, subscriberId))
    .orderBy(desc(wellnessLogs.loggedAt));

  const todayLogs = recent.filter((l) => new Date(l.loggedAt) >= todayStart);
  const sameActivityToday = todayLogs.filter((l) => l.activityId === activityId);
  const todayQtySame = sameActivityToday.reduce((s, l) => s + l.quantity, 0);
  const activeIds = new Set(
    (await db.select().from(wellnessActivities)).filter((a) =>
      ["Move", "Strength"].includes(a.category) && a.unit === "min"
    ).map((a) => a.id)
  );
  const todayActiveMinutes = todayLogs.filter((l) => activeIds.has(l.activityId)).reduce((s, l) => s + l.quantity, 0);
  const logsLastHour = recent.filter((l) => now.getTime() - new Date(l.loggedAt).getTime() < 3600000).length;
  const lastSame = sameActivityToday[0]?.loggedAt ?? null;
  const accountAgeDays = sub?.createdAt ? Math.max(0, (now.getTime() - new Date(sub.createdAt).getTime()) / 86400000) : 0;
  const firstDayPoints = accountAgeDays <= 1 ? recent.reduce((s, l) => s + l.pointsEarned, 0) : 0;
  const recentQuantities = recent.slice(0, 10).map((l) => l.quantity).reverse();

  const screening = screenLog({
    activityKey: act.key,
    quantity: Number(quantity),
    now,
    todayQtySameActivity: todayQtySame,
    todayActiveMinutes,
    logsLastHour,
    lastLogAtSameActivity: lastSame ? new Date(lastSame) : null,
    firstDayPoints,
    accountAgeDays,
    recentQuantities,
  });

  const points = Math.round(act.pointsPerUnit * Number(quantity));
  const calories = Math.round(act.caloriesPerUnit * Number(quantity) * 10) / 10;
  const level = screening.level;
  const weight = LEVEL_META[level].challengeWeight;
  const verifiedPoints = screening.passed ? Math.round(points * weight) : 0;

  const [row] = await db
    .insert(wellnessLogs)
    .values({
      subscriberId,
      activityId,
      quantity: Number(quantity),
      steps: Number(steps || 0),
      pointsEarned: points,
      calories,
      mood: mood || null,
      note: note || null,
      verificationLevel: level,
      verificationMethod: screening.passed ? "auto-checks" : "self",
      verifiedPoints,
      flagged: !screening.passed,
      flagCodes: screening.flags.map((f) => f.code),
      flagReason: screening.flags.map((f) => f.message).join(" | ") || null,
      evidenceCount: 0,
    })
    .returning();

  // Trust score update
  const trustDelta = screening.passed ? 1 : -8;
  await db.execute(sql`update subscribers set trust_score = greatest(0, least(100, trust_score + ${trustDelta})),
    flagged_logs = flagged_logs + ${screening.passed ? 0 : 1} where id = ${subscriberId}`);

  if (!screening.passed) {
    await db.insert(fraudEvents).values({
      subscriberId,
      logId: row.id,
      codes: screening.flags.map((f) => f.code),
      detail: screening.flags.map((f) => f.message).join(" | "),
    });
  }

  // Update challenge verified progress for all active enrollments (simple model: all verified points count)
  await db.execute(sql`update challenge_enrollments set verified_progress = verified_progress + ${verifiedPoints},
    progress = progress + ${points} where subscriber_id = ${subscriberId}`);

  return Response.json({
    ok: true,
    log: { ...row, activity: act, levelMeta: LEVEL_META[level] },
    screening: { passed: screening.passed, level, flags: screening.flags, checks: screening.checks, trustDelta },
  });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return Response.json({ ok: false, error: "id required" }, { status: 400 });
  await db.execute(sql`delete from wellness_logs where id = ${id}`);
  return Response.json({ ok: true });
}
