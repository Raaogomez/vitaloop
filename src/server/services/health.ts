// ── Health Connect service: ingest → aggregate → auto-verify ──
import { db } from "@/db";
import {
  healthConnections, healthRecords, healthSyncs, wellnessLogs,
  wellnessActivities, verificationEvidence, subscribers,
} from "@/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { ACTIVITY_SENSOR_MAP, generateDemoSensorWeek, type SyncRecordInput } from "@/lib/healthconnect";
import { LEVEL_META } from "@/lib/verification";
import { badRequest } from "../errors";
import { audit } from "./audit";

export async function connectDevice(subscriberId: number, deviceName?: string, scopes?: string[]) {
  const existing = (await db.select().from(healthConnections).where(eq(healthConnections.subscriberId, subscriberId)))[0];
  if (existing) {
    await db.execute(sql`update health_connections set status='connected',
      device_name=${deviceName || existing.deviceName},
      scopes=${JSON.stringify(scopes || [])}::jsonb, last_sync_at=now() where id=${existing.id}`);
    return (await db.select().from(healthConnections).where(eq(healthConnections.id, existing.id)))[0];
  }
  const [row] = await db.insert(healthConnections).values({
    subscriberId, deviceName: deviceName || "Android device",
    deviceId: `dev-${Date.now().toString(36)}`, status: "connected", scopes: scopes || [],
  }).returning();
  await audit(subscriberId, "health.connected", { deviceName });
  return row;
}

export async function ingest(subscriberId: number, records: SyncRecordInput[], demo = false) {
  if (!subscriberId) throw badRequest("subscriberId required");
  const list = demo ? generateDemoSensorWeek() : records;
  if (!list.length) throw badRequest("No records to sync");

  let [conn] = await db.select().from(healthConnections).where(eq(healthConnections.subscriberId, subscriberId));
  if (!conn) {
    [conn] = await db.insert(healthConnections).values({
      subscriberId, deviceName: demo ? "Demo sensor (simulated)" : "Android device",
      status: "connected", scopes: ["Steps", "ExerciseSession", "SleepSession"],
    }).returning();
  }

  let stored = 0;
  for (const r of list.slice(0, 500)) {
    if (!r.recordType || r.value === undefined || !r.startTime || !r.endTime) continue;
    await db.insert(healthRecords).values({
      subscriberId, connectionId: conn.id, recordType: r.recordType,
      value: Number(r.value), unit: r.unit || "count",
      startTime: new Date(r.startTime), endTime: new Date(r.endTime),
      sourceApp: r.sourceApp || "Health Connect", raw: r.raw || {},
    });
    stored++;
  }
  await db.execute(sql`update health_connections set last_sync_at=now(), total_records=total_records+${stored} where id=${conn.id}`);

  // auto-verify recent unverified logs against ±2h sensor windows
  const outcomes: { logId: number; activityKey: string; matched: boolean; newLevel: string; sensorSummary: string; bonusPoints: number }[] = [];
  const acts = await db.select().from(wellnessActivities);
  const byId = new Map(acts.map((a) => [a.id, a]));
  const recentLogs = (await db.select().from(wellnessLogs)
    .where(eq(wellnessLogs.subscriberId, subscriberId)).orderBy(desc(wellnessLogs.loggedAt)))
    .filter((l) => l.verificationLevel === "self" || l.verificationLevel === "plausible").slice(0, 40);
  const sensorRows = await db.select().from(healthRecords)
    .where(eq(healthRecords.subscriberId, subscriberId)).orderBy(desc(healthRecords.startTime));

  let autoVerified = 0;
  for (const log of recentLogs) {
    const act = byId.get(log.activityId);
    if (!act) continue;
    const mapping = ACTIVITY_SENSOR_MAP[act.key];
    if (!mapping || mapping.types.length === 0) continue;
    const logTime = new Date(log.loggedAt).getTime();
    const relevant = sensorRows.filter((s) =>
      (mapping.types as readonly string[]).includes(s.recordType) &&
      Math.abs(new Date(s.startTime).getTime() - logTime) < 26 * 3600000
    );
    if (!relevant.length) continue;
    let matched = false, summary = "";
    const qty = log.quantity;
    if (act.key === "morning-walk") {
      const steps = relevant.filter((r) => r.recordType === "Steps").reduce((s, r) => s + r.value, 0);
      const expected = qty * 100;
      matched = steps >= expected * 0.7 && steps <= expected * 1.6;
      summary = `${Math.round(steps).toLocaleString()} sensor steps vs ~${Math.round(expected).toLocaleString()} expected (${qty} min)`;
    } else if (act.key === "sleep") {
      const hrs = relevant.filter((r) => r.recordType === "SleepSession").reduce((s, r) => s + r.value, 0);
      matched = Math.abs(hrs - qty) <= 1.5;
      summary = `${hrs.toFixed(1)}h sensor sleep vs ${qty}h claimed`;
    } else if (act.key === "water") {
      const liters = relevant.filter((r) => r.recordType === "Hydration").reduce((s, r) => s + r.value, 0);
      matched = Math.abs(liters - qty * 0.25) <= 0.5;
      summary = `${liters.toFixed(1)}L sensor hydration vs ${(qty * 0.25).toFixed(1)}L claimed`;
    } else {
      const kcal = relevant.filter((r) => r.recordType === "ActiveCaloriesBurned").reduce((s, r) => s + r.value, 0);
      const hasSession = relevant.some((r) => r.recordType === "ExerciseSession");
      matched = hasSession || kcal >= qty * 2;
      summary = hasSession ? "ExerciseSession found in window" : `${Math.round(kcal)} kcal in window`;
    }
    if (matched) {
      const newPts = Math.round(log.pointsEarned * LEVEL_META.certified.challengeWeight);
      const delta = newPts - (log.verifiedPoints ?? 0);
      await db.execute(sql`update wellness_logs set verification_level='certified',
        verification_method='sensor', verified_points=${newPts}, flagged=false,
        flag_reason=null, evidence_count=evidence_count+1 where id=${log.id}`);
      await db.insert(verificationEvidence).values({
        logId: log.id, subscriberId, method: "sensor",
        detail: `Health Connect auto-match: ${summary}.`, status: "accepted",
      });
      await db.execute(sql`update subscribers set trust_score=least(100, trust_score+4),
        verified_logs=verified_logs+1 where id=${subscriberId}`);
      if (delta !== 0) {
        await db.execute(sql`update challenge_enrollments set verified_progress=verified_progress+${delta} where subscriber_id=${subscriberId}`);
      }
      autoVerified++;
      outcomes.push({ logId: log.id, activityKey: act.key, matched: true, newLevel: "certified", sensorSummary: summary, bonusPoints: newPts - log.pointsEarned });
    }
  }

  const [syncRow] = await db.insert(healthSyncs).values({
    subscriberId, connectionId: conn.id, recordsReceived: list.length,
    recordsStored: stored, logsAutoVerified: autoVerified, logsFlagged: 0,
    summary: { outcomes: outcomes.slice(0, 20) },
  }).returning();
  await audit(subscriberId, "health.synced", { stored, autoVerified, demo });
  return { stored, received: list.length, autoVerified, outcomes: outcomes.slice(0, 20), sync: syncRow };
}

export async function aggregate(subscriberId: number, days = 7) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await db.select().from(healthRecords)
    .where(and(eq(healthRecords.subscriberId, subscriberId), gte(healthRecords.startTime, since)));
  const buckets: Record<string, Record<string, number>> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    buckets[d] = { Steps: 0, Distance: 0, ActiveCaloriesBurned: 0, FloorsClimbed: 0, Hydration: 0, SleepSession: 0 };
  }
  for (const r of rows) {
    const day = new Date(r.startTime).toISOString().slice(0, 10);
    if (buckets[day] && r.recordType in buckets[day]) buckets[day][r.recordType] += r.value;
  }
  return {
    daily: Object.entries(buckets).map(([day, v]) => ({ day: day.slice(5), full: day, ...v })),
    recordCount: rows.length,
  };
}
