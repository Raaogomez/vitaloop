import { db } from "@/db";
import {
  healthConnections,
  healthRecords,
  healthSyncs,
  wellnessLogs,
  wellnessActivities,
  verificationEvidence,
  subscribers,
} from "@/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import {
  generateDemoSensorWeek,
  ACTIVITY_SENSOR_MAP,
  type SyncRecordInput,
  type AutoVerifyOutcome,
} from "@/lib/healthconnect";
import { LEVEL_META } from "@/lib/verification";

export const dynamic = "force-dynamic";

// ── GET ──
// ?action=status&subscriberId=1
// ?action=records&subscriberId=1&type=Steps&days=7
// ?action=aggregate&subscriberId=1&days=7
// ?action=syncs&subscriberId=1
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "status";
  const subscriberId = Number(searchParams.get("subscriberId"));

  if (action === "status") {
    if (!subscriberId) return Response.json({ ok: false, error: "subscriberId required" }, { status: 400 });
    const conns = await db.select().from(healthConnections)
      .where(eq(healthConnections.subscriberId, subscriberId))
      .orderBy(desc(healthConnections.createdAt));
    const countRes = await db.execute(sql`select count(*)::int as c from health_records where subscriber_id = ${subscriberId}`);
    const c = (countRes as unknown as { rows: { c: number }[] }).rows[0]?.c ?? 0;
    return Response.json({ ok: true, connections: conns, recordCount: c, connected: conns.some((x) => x.status === "connected") });
  }

  if (action === "records") {
    if (!subscriberId) return Response.json({ ok: false, error: "subscriberId required" }, { status: 400 });
    const type = searchParams.get("type");
    const days = Number(searchParams.get("days") || 7);
    const since = new Date(Date.now() - days * 86400000);
    let rows = await db.select().from(healthRecords)
      .where(and(eq(healthRecords.subscriberId, subscriberId), gte(healthRecords.startTime, since)))
      .orderBy(desc(healthRecords.startTime));
    if (type && type !== "All") rows = rows.filter((r) => r.recordType === type);
    return Response.json({ ok: true, records: rows.slice(0, 300) });
  }

  if (action === "aggregate") {
    if (!subscriberId) return Response.json({ ok: false, error: "subscriberId required" }, { status: 400 });
    const days = Number(searchParams.get("days") || 7);
    const since = new Date(Date.now() - days * 86400000);
    const rows = await db.select().from(healthRecords)
      .where(and(eq(healthRecords.subscriberId, subscriberId), gte(healthRecords.startTime, since)));

    // Daily buckets
    const buckets: Record<string, Record<string, number>> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      buckets[d] = { Steps: 0, Distance: 0, ActiveCaloriesBurned: 0, FloorsClimbed: 0, Hydration: 0, SleepSession: 0 };
    }
    for (const r of rows) {
      const day = new Date(r.startTime).toISOString().slice(0, 10);
      if (!buckets[day]) continue;
      if (r.recordType in buckets[day]) buckets[day][r.recordType] += r.value;
      if (r.recordType === "ExerciseSession") buckets[day].Steps += 0; // sessions counted separately
    }
    const daily = Object.entries(buckets).map(([day, v]) => ({ day: day.slice(5), full: day, ...v }));
    const totals: Record<string, number> = {};
    for (const r of rows) totals[r.recordType] = (totals[r.recordType] ?? 0) + r.value;
    const byType = Object.entries(totals).map(([type, total]) => ({
      type, total: Math.round(total * 10) / 10,
      count: rows.filter((r) => r.recordType === type).length,
    })).sort((a, b) => b.count - a.count);

    return Response.json({ ok: true, daily, byType, recordCount: rows.length });
  }

  if (action === "syncs") {
    if (!subscriberId) return Response.json({ ok: false, error: "subscriberId required" }, { status: 400 });
    const rows = await db.select().from(healthSyncs)
      .where(eq(healthSyncs.subscriberId, subscriberId))
      .orderBy(desc(healthSyncs.createdAt));
    return Response.json({ ok: true, syncs: rows.slice(0, 20) });
  }

  return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
}

// ── POST ──
// { action:"connect" | "sync" | "demo-seed", ... }
export async function POST(req: Request) {
  const body = await req.json();
  const action = body.action as string;

  // ── CONNECT: register device + granted scopes ──
  if (action === "connect") {
    const { subscriberId, deviceName, deviceId, scopes } = body as {
      subscriberId: number; deviceName?: string; deviceId?: string; scopes?: string[];
    };
    if (!subscriberId) return Response.json({ ok: false, error: "subscriberId required" }, { status: 400 });
    const existing = await db.select().from(healthConnections)
      .where(eq(healthConnections.subscriberId, subscriberId));
    if (existing[0]) {
      await db.execute(sql`update health_connections set status='connected',
        device_name=${deviceName || existing[0].deviceName},
        scopes=${JSON.stringify(scopes || [])}::jsonb, last_sync_at=now() where id=${existing[0].id}`);
      const [u] = await db.select().from(healthConnections).where(eq(healthConnections.id, existing[0].id));
      return Response.json({ ok: true, connection: u, reconnected: true });
    }
    const [row] = await db.insert(healthConnections).values({
      subscriberId,
      deviceName: deviceName || "Android device",
      deviceId: deviceId || `dev-${Date.now().toString(36)}`,
      status: "connected",
      scopes: scopes || [],
    }).returning();
    return Response.json({ ok: true, connection: row });
  }

  // ── SYNC: ingest records → aggregate → auto-verify ──
  if (action === "sync" || action === "demo-seed") {
    const { subscriberId, records: incoming, sourceApp } = body as {
      subscriberId: number; records?: SyncRecordInput[]; sourceApp?: string;
    };
    if (!subscriberId) return Response.json({ ok: false, error: "subscriberId required" }, { status: 400 });

    let records: SyncRecordInput[] = incoming || [];
    if (action === "demo-seed") records = generateDemoSensorWeek();
    if (!records.length) return Response.json({ ok: false, error: "no records" }, { status: 400 });

    // ensure connection
    let [conn] = await db.select().from(healthConnections).where(eq(healthConnections.subscriberId, subscriberId));
    if (!conn) {
      [conn] = await db.insert(healthConnections).values({
        subscriberId, deviceName: action === "demo-seed" ? "Demo sensor (simulated)" : "Android device",
        status: "connected", scopes: ["Steps", "ExerciseSession", "SleepSession"],
      }).returning();
    }

    // store records
    let stored = 0;
    for (const r of records.slice(0, 500)) {
      if (!r.recordType || r.value === undefined || !r.startTime || !r.endTime) continue;
      await db.insert(healthRecords).values({
        subscriberId,
        connectionId: conn.id,
        recordType: r.recordType,
        value: Number(r.value),
        unit: r.unit || "count",
        startTime: new Date(r.startTime),
        endTime: new Date(r.endTime),
        sourceApp: r.sourceApp || sourceApp || "Health Connect",
        raw: r.raw || {},
      });
      stored++;
    }
    await db.execute(sql`update health_connections set last_sync_at=now(), total_records=total_records+${stored} where id=${conn.id}`);

    // ── AUTO-VERIFY: match sensor windows to recent unverified logs ──
    const outcomes: AutoVerifyOutcome[] = [];
    const acts = await db.select().from(wellnessActivities);
    const actById = new Map(acts.map((a) => [a.id, a]));
    const recentLogs = await db.select().from(wellnessLogs)
      .where(eq(wellnessLogs.subscriberId, subscriberId))
      .orderBy(desc(wellnessLogs.loggedAt));
    const candidates = recentLogs.filter((l) =>
      l.verificationLevel === "self" || l.verificationLevel === "plausible"
    ).slice(0, 40);

    const sensorRows = await db.select().from(healthRecords)
      .where(eq(healthRecords.subscriberId, subscriberId))
      .orderBy(desc(healthRecords.startTime));

    let autoVerified = 0, flagged = 0;
    for (const log of candidates) {
      const act = actById.get(log.activityId);
      if (!act) continue;
      const mapping = ACTIVITY_SENSOR_MAP[act.key];
      if (!mapping || mapping.types.length === 0) continue;

      const logTime = new Date(log.loggedAt).getTime();
      const windowMs = 2 * 3600000; // ±2h
      const relevant = sensorRows.filter((s) =>
        (mapping.types as readonly string[]).includes(s.recordType) &&
        Math.abs(new Date(s.startTime).getTime() - logTime) < windowMs + 24 * 3600000
      );
      if (!relevant.length) continue;

      // Claim-specific matching
      let matched = false;
      let summary = "";
      const qty = log.quantity;

      if (act.key === "morning-walk") {
        const steps = relevant.filter((r) => r.recordType === "Steps").reduce((s, r) => s + r.value, 0);
        const expected = qty * 100;
        matched = steps >= expected * 0.7 && steps <= expected * 1.6;
        summary = `${Math.round(steps).toLocaleString()} sensor steps vs ~${Math.round(expected).toLocaleString()} expected (${qty} min)`;
      } else if (act.key === "stair-climb") {
        const floors = relevant.filter((r) => r.recordType === "FloorsClimbed").reduce((s, r) => s + r.value, 0);
        const expected = (qty / 5) * 2;
        matched = floors >= expected * 0.6;
        summary = `${floors} floors in window vs ~${expected.toFixed(1)} expected`;
      } else if (act.key === "sleep") {
        const sleepHrs = relevant.filter((r) => r.recordType === "SleepSession").reduce((s, r) => s + r.value, 0);
        matched = Math.abs(sleepHrs - qty) <= 1.5;
        summary = `${sleepHrs.toFixed(1)}h sensor sleep vs ${qty}h claimed`;
      } else if (act.key === "water") {
        const liters = relevant.filter((r) => r.recordType === "Hydration").reduce((s, r) => s + r.value, 0);
        matched = Math.abs(liters - qty * 0.25) <= 0.5;
        summary = `${liters.toFixed(1)}L sensor hydration vs ${(qty * 0.25).toFixed(1)}L claimed`;
      } else if (act.key === "dance-break" || act.key === "cycle-commute") {
        const hasSession = relevant.some((r) => r.recordType === "ExerciseSession");
        const hr = relevant.filter((r) => r.recordType === "HeartRate").map((r) => r.value);
        const avgHr = hr.length ? hr.reduce((a, b) => a + b, 0) / hr.length : 0;
        matched = hasSession || avgHr >= 105;
        summary = hasSession ? "ExerciseSession found in window" : avgHr ? `avg HR ${Math.round(avgHr)}bpm in window` : "no exertion signal";
      } else {
        // generic: any calorie/step signal in window
        const kcal = relevant.filter((r) => r.recordType === "ActiveCaloriesBurned").reduce((s, r) => s + r.value, 0);
        matched = kcal >= qty * 2;
        summary = `${Math.round(kcal)} kcal in window vs ≥${Math.round(qty * 2)} expected`;
      }

      if (matched) {
        const weight = LEVEL_META.certified.challengeWeight;
        const newPts = Math.round(log.pointsEarned * weight);
        const delta = newPts - (log.verifiedPoints ?? 0);
        await db.execute(sql`update wellness_logs set verification_level='certified',
          verification_method='sensor', verified_points=${newPts}, flagged=false,
          flag_reason=null, evidence_count=evidence_count+1 where id=${log.id}`);
        await db.insert(verificationEvidence).values({
          logId: log.id, subscriberId, method: "sensor",
          detail: `Health Connect auto-match: ${summary}. Window ±2h, tolerance ±30%.`,
          status: "accepted",
        });
        await db.execute(sql`update subscribers set trust_score=least(100, trust_score+4),
          verified_logs=verified_logs+1 where id=${subscriberId}`);
        if (delta !== 0) {
          await db.execute(sql`update challenge_enrollments set verified_progress=verified_progress+${delta} where subscriber_id=${subscriberId}`);
        }
        autoVerified++;
        outcomes.push({ logId: log.id, activityKey: act.key, matched: true, newLevel: "certified", sensorSummary: summary, bonusPoints: newPts - log.pointsEarned });
      } else if (log.verificationLevel === "self" && log.flagged) {
        flagged++;
        outcomes.push({ logId: log.id, activityKey: act.key, matched: false, newLevel: "unchanged", sensorSummary: summary || "no corroborating sensor signal", bonusPoints: 0 });
      }
    }

    const [syncRow] = await db.insert(healthSyncs).values({
      subscriberId, connectionId: conn.id,
      recordsReceived: records.length, recordsStored: stored,
      logsAutoVerified: autoVerified, logsFlagged: flagged,
      summary: { outcomes: outcomes.slice(0, 20) },
    }).returning();

    return Response.json({
      ok: true, stored, received: records.length,
      autoVerified, flagged, outcomes: outcomes.slice(0, 20), sync: syncRow,
    });
  }

  return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
}

// ── DELETE: disconnect ──
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const subscriberId = Number(searchParams.get("subscriberId"));
  const deleteData = searchParams.get("deleteData") === "1";
  if (!subscriberId) return Response.json({ ok: false, error: "subscriberId required" }, { status: 400 });
  await db.execute(sql`update health_connections set status='disconnected' where subscriber_id=${subscriberId}`);
  if (deleteData) {
    await db.execute(sql`delete from health_records where subscriber_id=${subscriberId}`);
  }
  return Response.json({ ok: true, deleted: deleteData });
}
