// ── VitalLoop × Google Health Connect integration ──
// Health Connect (Android 14+, backported via Play Store) is the on-device
// aggregator for steps, distance, calories, heart-rate, sleep, exercise sessions,
// hydration and more. VitalLoop reads it (with explicit permission) and uses it
// for TWO jobs: (1) aggregate passive activity data, (2) auto-verify self-logs.

// Official Health Connect record types we consume (subset)
export const HC_RECORD_TYPES = [
  { type: "Steps", scope: "android.permission.health.READ_STEPS", unit: "count", mapsTo: ["morning-walk"], desc: "Step bursts from phone/watch pedometer" },
  { type: "Distance", scope: "android.permission.health.READ_DISTANCE", unit: "m", mapsTo: ["morning-walk", "cycle-commute"], desc: "Distance per session" },
  { type: "ActiveCaloriesBurned", scope: "android.permission.health.READ_ACTIVE_CALORIES_BURNED", unit: "kcal", mapsTo: ["morning-walk", "dance-break", "stair-climb", "house-chores"], desc: "Active energy" },
  { type: "TotalCaloriesBurned", scope: "android.permission.health.READ_TOTAL_CALORIES_BURNED", unit: "kcal", mapsTo: [], desc: "Total energy incl. BMR" },
  { type: "HeartRate", scope: "android.permission.health.READ_HEART_RATE", unit: "bpm", mapsTo: ["dance-break", "stair-climb", "cycle-commute"], desc: "Proves exertion intensity" },
  { type: "ExerciseSession", scope: "android.permission.health.READ_EXERCISE", unit: "session", mapsTo: ["morning-walk", "dance-break", "cycle-commute", "stair-climb"], desc: "Typed workouts with start/end" },
  { type: "SleepSession", scope: "android.permission.health.READ_SLEEP", unit: "session", mapsTo: ["sleep"], desc: "Bed/wake + stages" },
  { type: "FloorsClimbed", scope: "android.permission.health.READ_FLOORS_CLIMBED", unit: "floors", mapsTo: ["stair-climb"], desc: "Barometer-derived floors" },
  { type: "Hydration", scope: "android.permission.health.READ_HYDRATION", unit: "L", mapsTo: ["water"], desc: "Water intake entries" },
  { type: "Speed", scope: "android.permission.health.READ_SPEED", unit: "m/s", mapsTo: ["cycle-commute", "morning-walk"], desc: "Distinguishes cycle vs walk vs vehicle" },
] as const;

export type HcRecordType = (typeof HC_RECORD_TYPES)[number]["type"];

// Scopes requested on connect (READ only — VitalLoop never writes health data)
export const HC_READ_SCOPES = HC_RECORD_TYPES.map((r) => r.scope);

// Maps a VitalLoop activity key → which HC record types can verify it
export const ACTIVITY_SENSOR_MAP: Record<string, { types: HcRecordType[]; rule: string; tolerance: string }> = {
  "morning-walk": { types: ["Steps", "Distance", "ExerciseSession"], rule: "≥80 steps per claimed minute within ±2h window", tolerance: "±30% of claim" },
  "stair-climb": { types: ["FloorsClimbed", "HeartRate", "ExerciseSession"], rule: "≥2 floors per claimed 5 min + HR ≥100bpm in window", tolerance: "±35%" },
  "house-chores": { types: ["ActiveCaloriesBurned", "Steps"], rule: "≥2.5 kcal per claimed minute", tolerance: "±40% (weak signal — needs photo too)" },
  "market-carry": { types: ["Steps", "ActiveCaloriesBurned"], rule: "Steps + elevated kcal in window (peer witness still required for ★)", tolerance: "advisory only" },
  "dance-break": { types: ["HeartRate", "ActiveCaloriesBurned", "ExerciseSession"], rule: "HR ≥110bpm sustained ≥60% of session", tolerance: "±30%" },
  "farming-garden": { types: ["Steps", "ActiveCaloriesBurned"], rule: "Sustained low-grade activity 5am–7pm + daylight", tolerance: "±40%" },
  "cycle-commute": { types: ["Speed", "Distance", "ExerciseSession"], rule: "Avg speed 8–30 km/h in window (excludes danfo rides)", tolerance: "strict band" },
  "stretch-snack": { types: [], rule: "No sensor signal — guided in-app completion is the proof", tolerance: "n/a" },
  water: { types: ["Hydration"], rule: "Hydration entries sum ≥ claimed glasses × 0.25L", tolerance: "±1 glass" },
  "veg-plate": { types: [], rule: "No sensor signal — meal photo is the proof", tolerance: "n/a" },
  sleep: { types: ["SleepSession"], rule: "SleepSession overlaps claimed window ≥70%", tolerance: "±45 min on each edge" },
  breathe: { types: ["HeartRate"], rule: "Optional: HR dip ≥5% during session corroborates calm", tolerance: "advisory only" },
  "no-soda": { types: [], rule: "No sensor signal — swap photo + squad pledge", tolerance: "n/a" },
  sunlight: { types: [], rule: "No direct sensor — time window 6–11am + outdoor photo", tolerance: "n/a" },
};

export type SyncRecordInput = {
  recordType: string;
  value: number;
  unit?: string;
  startTime: string; // ISO
  endTime: string; // ISO
  sourceApp?: string;
  raw?: Record<string, unknown>;
};

export type AutoVerifyOutcome = {
  logId: number;
  activityKey: string;
  matched: boolean;
  newLevel: "certified" | "verified" | "unchanged";
  sensorSummary: string;
  bonusPoints: number;
};

// Tolerance check helper shared by server + client explainer
export function withinTolerance(sensorQty: number, claimedQty: number, pct = 0.3): boolean {
  if (claimedQty <= 0) return false;
  const lo = claimedQty * (1 - pct);
  const hi = claimedQty * (1 + pct);
  return sensorQty >= lo && sensorQty <= hi;
}

// Estimate walk-minutes from steps (≈100 steps/min brisk)
export function stepsToMinutes(steps: number): number {
  return Math.round((steps / 100) * 10) / 10;
}

// ── Demo sensor generator (deterministic-ish, realistic week) ──
export function generateDemoSensorWeek(now = new Date()): SyncRecordInput[] {
  const out: SyncRecordInput[] = [];
  const rnd = (min: number, max: number) => min + Math.random() * (max - min);
  for (let d = 6; d >= 0; d--) {
    const day = new Date(now.getTime() - d * 86400000);
    const iso = (h: number, m = 0) => {
      const t = new Date(day); t.setHours(h, m, 0, 0); return t.toISOString();
    };
    // morning walk commute
    const steps = Math.round(rnd(2200, 5200));
    out.push({ recordType: "Steps", value: steps, unit: "count", startTime: iso(7, 15), endTime: iso(8, 5), sourceApp: "Pixel Watch", raw: { segments: 3 } });
    out.push({ recordType: "Distance", value: Math.round(steps * 0.72), unit: "m", startTime: iso(7, 15), endTime: iso(8, 5), sourceApp: "Pixel Watch" });
    out.push({ recordType: "ExerciseSession", value: 1, unit: "session", startTime: iso(7, 15), endTime: iso(8, 5), sourceApp: "Google Fit", raw: { exerciseType: "walking", steps } });
    // stairs at work
    out.push({ recordType: "FloorsClimbed", value: Math.round(rnd(4, 12)), unit: "floors", startTime: iso(9), endTime: iso(17), sourceApp: "Samsung Health" });
    // active calories for the day
    out.push({ recordType: "ActiveCaloriesBurned", value: Math.round(rnd(280, 620)), unit: "kcal", startTime: iso(6), endTime: iso(22), sourceApp: "Health Connect" });
    // heart-rate workout 3x/week
    if (d % 2 === 0) {
      out.push({ recordType: "HeartRate", value: Math.round(rnd(118, 142)), unit: "bpm", startTime: iso(18, 10), endTime: iso(18, 35), sourceApp: "Pixel Watch", raw: { avg: true, activity: "dance" } });
    }
    // sleep previous night
    const bed = new Date(day.getTime() - 86400000); bed.setHours(22, 30, 0, 0);
    const wake = new Date(day); wake.setHours(6, 10, 0, 0);
    out.push({ recordType: "SleepSession", value: Math.round(((wake.getTime() - bed.getTime()) / 3600000) * 10) / 10, unit: "hours", startTime: bed.toISOString(), endTime: wake.toISOString(), sourceApp: "Pixel Watch", raw: { stages: { deep: 1.2, rem: 1.6, light: 4.4 } } });
    // hydration entries
    out.push({ recordType: "Hydration", value: Math.round(rnd(1.4, 2.6) * 10) / 10, unit: "L", startTime: iso(8), endTime: iso(21), sourceApp: "Water Reminder", raw: { entries: Math.round(rnd(5, 9)) } });
  }
  return out;
}

// ── Native bridge snippets served to the developer page ──
// Kotlin (Android Health Connect client)
export const KOTLIN_SNIPPET = `// VitalLoop Android — Health Connect client (Kotlin)
// Gradle: implementation("androidx.health.connect:connect-client:1.1.0-alpha08")
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.temporal.ChronoUnit

class VitalLoopHealthSync(private val context: Context) {
  private val client = HealthConnectClient.getOrCreate(context)

  val PERMISSIONS = setOf(
    HealthPermission.getReadPermission(StepsRecord::class),
    HealthPermission.getReadPermission(DistanceRecord::class),
    HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
    HealthPermission.getReadPermission(HeartRateRecord::class),
    HealthPermission.getReadPermission(ExerciseSessionRecord::class),
    HealthPermission.getReadPermission(SleepSessionRecord::class),
    HealthPermission.getReadPermission(FloorsClimbedRecord::class),
    HealthPermission.getReadPermission(HydrationRecord::class),
    HealthPermission.getReadPermission(SpeedRecord::class),
  )

  suspend fun hasPermissions(): Boolean =
    client.permissionController.getGrantedPermissions().containsAll(PERMISSIONS)

  // 1) Check SDK availability (Android 14+ or Play Store provider)
  suspend fun availability() = HealthConnectClient.getSdkStatus(context)

  // 2) Read last 24h of steps + exercise + sleep, push to VitalLoop backend
  suspend fun syncLast24h(subscriberId: Int) {
    val end = Instant.now()
    val start = end.minus(1, ChronoUnit.DAYS)
    val filter = TimeRangeFilter.between(start, end)

    val steps = client.readRecords(ReadRecordsRequest(StepsRecord::class, filter)).records
    val exercise = client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, filter)).records
    val sleep = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, filter)).records
    val floors = client.readRecords(ReadRecordsRequest(FloorsClimbedRecord::class, filter)).records
    val hydration = client.readRecords(ReadRecordsRequest(HydrationRecord::class, filter)).records
    val calories = client.readRecords(ReadRecordsRequest(ActiveCaloriesBurnedRecord::class, filter)).records

    val payload = buildJsonPayload(steps, exercise, sleep, floors, hydration, calories)
    // POST https://your-host/api/health-connect  { action:"sync", subscriberId, records: payload }
    VitalLoopApi.postHealthSync(subscriberId, payload)
  }
}`;

export const EXPO_SNIPPET = `// VitalLoop Mobile (Expo) — react-native-health-connect
// npx expo install react-native-health-connect
import {
  initialize, requestPermission, readRecords,
} from 'react-native-health-connect';

const RECORD_TYPES = [
  'Steps', 'Distance', 'ActiveCaloriesBurned', 'HeartRate',
  'ExerciseSession', 'SleepSession', 'FloorsClimbed', 'Hydration', 'Speed',
];

export async function connectHealth(subscriberId: number) {
  const ok = await initialize();               // prompts install if missing
  if (!ok) throw new Error('Health Connect unavailable');
  const granted = await requestPermission(
    RECORD_TYPES.map((t) => ({ accessType: 'read', recordType: t }))
  );
  // register connection server-side
  await fetch('/api/health-connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'connect', subscriberId, deviceName: 'Android app', scopes: granted.map(g => g.recordType) }),
  });
  return granted;
}

export async function syncHealth(subscriberId: number) {
  const end = new Date().toISOString();
  const start = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const records: any[] = [];
  for (const recordType of RECORD_TYPES) {
    try {
      const rows = await readRecords(recordType, { timeRangeFilter: { operator: 'between', startTime: start, endTime: end } });
      rows.forEach((r: any) => records.push(normalize(recordType, r)));
    } catch { /* type unsupported on device — skip */ }
  }
  const res = await fetch('/api/health-connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sync', subscriberId, records }),
  });
  return res.json(); // → { stored, autoVerified, flagged, outcomes[] }
}`;

export const PWA_SNIPPET = `// VitalLoop PWA — installable web app (no store needed)
// 1) public/manifest.webmanifest is already wired in this prototype.
// 2) Service worker (public/sw.js) caches shell + queues offline logs:
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/logs') && event.request.method === 'POST') {
    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        const queue = JSON.parse((await caches.match('vl-queue')) || '[]');
        queue.push(await event.request.clone().json());
        // ...persist to IndexedDB, replay on 'sync' event
        return new Response(JSON.stringify({ ok: true, queued: true }), { status: 202 });
      })
    );
  }
});
// 3) Android PWA + Health Connect: PWA opens the native bridge via
//    an installed "VitalLoop Sync" helper (Trusted Web Activity) OR
//    the Expo/Capacitor shell below — browsers cannot read HC directly.`;
