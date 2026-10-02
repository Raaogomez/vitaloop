// ── VitalLoop Verification & Anti-Fraud Engine ──
// Every log passes through plausibility screening at write-time.
// Levels: self → plausible → verified → certified
// Challenges count ONLY plausible+ points; flagged logs earn 0 challenge points.

export type VerificationLevel = "self" | "plausible" | "verified" | "certified";
export type VerificationMethod =
  | "self"
  | "auto-checks"
  | "timer"
  | "photo"
  | "peer"
  | "sensor"
  | "checkin-pair"
  | "quiz";

export const LEVEL_META: Record<
  VerificationLevel,
  { label: string; color: string; bg: string; challengeWeight: number; desc: string }
> = {
  self: {
    label: "Self-logged",
    color: "#64748b",
    bg: "#f1f5f9",
    challengeWeight: 0,
    desc: "Claimed only. Counts toward personal score, NOT toward challenge prizes.",
  },
  plausible: {
    label: "Plausible ✓",
    color: "#0e7490",
    bg: "#cffafe",
    challengeWeight: 1,
    desc: "Passed all 8 automated fraud checks. Counts fully toward challenges.",
  },
  verified: {
    label: "Verified ★",
    color: "#15803d",
    bg: "#dcfce7",
    challengeWeight: 1,
    desc: "Backed by evidence (photo / timer / peer witness). Counts fully + boosts Trust.",
  },
  certified: {
    label: "Certified ◆",
    color: "#7c3aed",
    bg: "#ede9fe",
    challengeWeight: 1.25,
    desc: "Sensor or authority-confirmed (pedometer, coach, clinic). Earns 25% challenge bonus.",
  },
};

// Per-activity verification playbook: how EACH of the 14 activities is proven
export type ActivityProof = {
  key: string;
  primary: string;
  methods: { method: VerificationMethod; label: string; how: string }[];
  dailyCap: string;
  perLogCap: number;
  fraudRisk: "Low" | "Medium" | "High";
  why: string;
};

export const ACTIVITY_PROOFS: ActivityProof[] = [
  {
    key: "morning-walk",
    primary: "Guided walk timer + step estimate",
    methods: [
      { method: "timer", label: "Walk timer", how: "In-app timer runs while you walk; must run ≥80% of claimed minutes. Can't claim 60 min after 3 min." },
      { method: "sensor", label: "Step counter", how: "Phone pedometer / Google Fit sync. ~100 steps ≈ 1 min. Auto-certified when sensor matches claim ±30%." },
      { method: "photo", label: "Route photo", how: "Optional photo of street/market proves you went out. Timestamped, one per day counts." },
    ],
    dailyCap: "180 min/day",
    perLogCap: 90,
    fraudRisk: "Medium",
    why: "Walking is the #1 faked activity globally. Timer + sensor cross-check kills lazy fraud.",
  },
  {
    key: "stair-climb",
    primary: "Timed session + floor count",
    methods: [
      { method: "timer", label: "Climb timer", how: "Short-burst timer (2–10 min). Claims above 15 min in one log are auto-capped." },
      { method: "photo", label: "Stairwell photo", how: "Photo of stairs/building. Community-reviewed; duplicates rejected by hash." },
    ],
    dailyCap: "45 min/day",
    perLogCap: 15,
    fraudRisk: "Medium",
    why: "High points/min make stairs attractive to game — so per-log caps are tight.",
  },
  {
    key: "house-chores",
    primary: "Chore timer + before/after photo",
    methods: [
      { method: "timer", label: "Chore sprint timer", how: "20/30-min sprint timer with check-ins. Pause = claim pauses." },
      { method: "photo", label: "Before/after", how: "Two photos (start + done). Strongest evidence class for chores." },
    ],
    dailyCap: "180 min/day",
    perLogCap: 60,
    fraudRisk: "High",
    why: "Invisible activity = highest fraud risk. Photo pairs + realistic duration windows are required for challenge credit.",
  },
  {
    key: "market-carry",
    primary: "Load photo + peer witness",
    methods: [
      { method: "photo", label: "Load photo", how: "Photo of goods/water/containers carried. Timestamp + rough weight tag." },
      { method: "peer", label: "Squad witness", how: "A squad member taps 'I saw this'. 1 witness = verified, 2 = certified." },
    ],
    dailyCap: "120 min/day",
    perLogCap: 45,
    fraudRisk: "High",
    why: "Carrying is social by nature (markets, family) — peer witnessing fits the context.",
  },
  {
    key: "dance-break",
    primary: "Music-synced timer",
    methods: [
      { method: "timer", label: "Dance timer", how: "3-song timer (~10 min). Must complete without backgrounding the app." },
      { method: "peer", label: "Squad dance-off", how: "Join a squad session; mutual presence = instant verification." },
    ],
    dailyCap: "90 min/day",
    perLogCap: 30,
    fraudRisk: "Medium",
    why: "Timer-completion is hard to fake at scale; social sessions add proof.",
  },
  {
    key: "farming-garden",
    primary: "Field photo + daylight window",
    methods: [
      { method: "photo", label: "Field photo", how: "Photo of farm/garden work. Must fall in 5am–7pm daylight window." },
      { method: "peer", label: "Co-worker witness", how: "Fellow worker confirms via USSD code or squad tap." },
    ],
    dailyCap: "300 min/day",
    perLogCap: 120,
    fraudRisk: "Low",
    why: "Long real durations + daylight constraint + photos make farming naturally verifiable.",
  },
  {
    key: "cycle-commute",
    primary: "Trip timer + distance sanity",
    methods: [
      { method: "timer", label: "Trip timer", how: "Point-to-point timer with start/stop taps; avg speed must be 8–30 km/h plausible." },
      { method: "sensor", label: "Phone motion", how: "Accelerometer cadence signature distinguishes cycling from sitting in traffic." },
    ],
    dailyCap: "180 min/day",
    perLogCap: 60,
    fraudRisk: "Low",
    why: "Motion signature + speed plausibility makes cycle fraud technically hard.",
  },
  {
    key: "stretch-snack",
    primary: "Guided 2-min routine (must complete)",
    methods: [
      { method: "timer", label: "Guided routine", how: "Follow the animated 2-min sequence in-app. Skipping = self-level only." },
      { method: "quiz", label: "Recall check", how: "Random 1-tap question after ('which stretch was 2nd?'). Bots fail this." },
    ],
    dailyCap: "30 min/day",
    perLogCap: 6,
    fraudRisk: "Low",
    why: "Tiny unit + interactive completion = more effort to fake than to do.",
  },
  {
    key: "water",
    primary: "Spaced logging + bottle photo",
    methods: [
      { method: "photo", label: "Bottle/cup photo", how: "One reusable bottle photo registered; daily check-ins reference it." },
      { method: "timer", label: "Spacing rule", how: "Max 2 glasses per log, ≥30 min apart. 8 glasses in one tap = flagged." },
    ],
    dailyCap: "15 glasses/day",
    perLogCap: 4,
    fraudRisk: "High",
    why: "One-tap logging invites spam — spacing + per-log caps are the entire defense.",
  },
  {
    key: "veg-plate",
    primary: "Meal photo (gold-standard evidence)",
    methods: [
      { method: "photo", label: "Plate photo", how: "Photo of plate; half-plate greens check (human + AI review). Each meal needs its own photo." },
      { method: "peer", label: "Family confirm", how: "Family-plan members can co-confirm shared meals." },
    ],
    dailyCap: "4 meals/day",
    perLogCap: 1,
    fraudRisk: "Medium",
    why: "Photos are decisive for food. Duplicate-photo hashing blocks gallery recycling.",
  },
  {
    key: "sleep",
    primary: "Bedtime + wake check-in pair",
    methods: [
      { method: "checkin-pair", label: "Sleep window pair", how: "Tap 'Sleeping' at night + 'Awake' in morning. Duration = verified hours. Single-sided claims stay self-level." },
      { method: "sensor", label: "Phone stillness", how: "Overnight phone inactivity corroborates the window (no data leaves the phone)." },
    ],
    dailyCap: "12 h/day",
    perLogCap: 10,
    fraudRisk: "Medium",
    why: "Paired check-ins across a night boundary are very hard to fabricate casually.",
  },
  {
    key: "breathe",
    primary: "Guided 3-min box-breathing (must complete)",
    methods: [
      { method: "timer", label: "Breathing session", how: "Complete the 4-4-4-4 animation in-app. Backgrounding pauses the session." },
      { method: "quiz", label: "Calm check", how: "Pre/post 1-tap stress rating; inconsistent patterns (always identical) decay trust." },
    ],
    dailyCap: "5 sessions/day",
    perLogCap: 1,
    fraudRisk: "Low",
    why: "Interactive sessions verify themselves — completion IS the proof.",
  },
  {
    key: "no-soda",
    primary: "Swap photo + pledge + peer",
    methods: [
      { method: "photo", label: "Swap photo", how: "Photo of water/zobo instead of soda at the moment of craving." },
      { method: "peer", label: "Squad pledge", how: "Daily pledge in squad; breaking it is socially visible. Squad streaks > solo." },
    ],
    dailyCap: "3 swaps/day",
    perLogCap: 1,
    fraudRisk: "High",
    why: "Proving a negative (NOT drinking) needs social + photo scaffolding.",
  },
  {
    key: "sunlight",
    primary: "Morning window + outdoor photo",
    methods: [
      { method: "photo", label: "Outdoor photo", how: "Daylight photo; must be logged 6–11am local. Afternoon 'morning sun' = implausible." },
      { method: "timer", label: "10-min outdoor timer", how: "Simple outdoor timer; screen-off allowed, GPS-optional." },
    ],
    dailyCap: "2 sessions/day",
    perLogCap: 1,
    fraudRisk: "Medium",
    why: "Time-window gating does most of the work; photos confirm outdoors.",
  },
];

// ── Automated fraud checks (run on every log) ──
export type FraudInput = {
  activityKey: string;
  quantity: number;
  now: Date;
  todayQtySameActivity: number;
  todayActiveMinutes: number;
  logsLastHour: number;
  lastLogAtSameActivity: Date | null;
  firstDayPoints: number;
  accountAgeDays: number;
  recentQuantities: number[];
};

export type FraudResult = {
  passed: boolean;
  level: VerificationLevel;
  flags: { code: string; message: string }[];
  checks: { name: string; passed: boolean; detail: string }[];
};

const PER_LOG_CAPS: Record<string, number> = {
  "morning-walk": 90, "stair-climb": 15, "house-chores": 60, "market-carry": 45,
  "dance-break": 30, "farming-garden": 120, "cycle-commute": 60, "stretch-snack": 6,
  water: 4, "veg-plate": 1, sleep: 10, breathe: 1, "no-soda": 1, sunlight: 1,
};

const DAILY_CAPS: Record<string, number> = {
  "morning-walk": 180, "stair-climb": 45, "house-chores": 180, "market-carry": 120,
  "dance-break": 90, "farming-garden": 300, "cycle-commute": 180, "stretch-snack": 30,
  water: 15, "veg-plate": 4, sleep: 12, breathe: 5, "no-soda": 3, sunlight: 2,
};

export function screenLog(input: FraudInput): FraudResult {
  const checks: FraudResult["checks"] = [];
  const flags: FraudResult["flags"] = [];
  const cap = PER_LOG_CAPS[input.activityKey] ?? 60;
  const dayCap = DAILY_CAPS[input.activityKey] ?? 120;

  // 1. Per-log cap
  const c1 = input.quantity <= cap;
  checks.push({ name: "Per-log cap", passed: c1, detail: c1 ? `${input.quantity} ≤ ${cap} max/log` : `${input.quantity} exceeds ${cap} max per single log` });
  if (!c1) flags.push({ code: "OVER_PER_LOG_CAP", message: `Single log of ${input.quantity} exceeds max ${cap}. Split into realistic sessions.` });

  // 2. Daily cap
  const c2 = input.todayQtySameActivity + input.quantity <= dayCap;
  checks.push({ name: "Daily cap", passed: c2, detail: c2 ? `Day total ${input.todayQtySameActivity + input.quantity}/${dayCap}` : `Would exceed daily cap ${dayCap}` });
  if (!c2) flags.push({ code: "OVER_DAILY_CAP", message: `Daily cap ${dayCap} for this activity would be exceeded.` });

  // 3. Velocity (max 8 logs/hour)
  const c3 = input.logsLastHour < 8;
  checks.push({ name: "Velocity", passed: c3, detail: c3 ? `${input.logsLastHour} logs in last hour (limit 8)` : `${input.logsLastHour} logs/hour — bot-like burst` });
  if (!c3) flags.push({ code: "VELOCITY_BURST", message: "Too many logs in one hour. Slow down — real life has gaps." });

  // 4. Duplicate burst (same activity < 5 min apart)
  let c4 = true;
  if (input.lastLogAtSameActivity) {
    const mins = (input.now.getTime() - new Date(input.lastLogAtSameActivity).getTime()) / 60000;
    c4 = mins >= 5;
    checks.push({ name: "Duplicate spacing", passed: c4, detail: c4 ? `Last same-activity log ${Math.round(mins)} min ago` : `Only ${Math.round(mins)} min since last identical log` });
    if (!c4) flags.push({ code: "DUPLICATE_BURST", message: "Same activity logged twice within 5 minutes." });
  } else {
    checks.push({ name: "Duplicate spacing", passed: true, detail: "First log of this activity today" });
  }

  // 5. Impossible day (>600 active min across move/strength)
  const isActiveMin =
    ["morning-walk", "stair-climb", "house-chores", "market-carry", "dance-break", "farming-garden", "cycle-commute"].includes(input.activityKey);
  const c5 = !isActiveMin || input.todayActiveMinutes + input.quantity <= 600;
  checks.push({ name: "Impossible day", passed: c5, detail: c5 ? `Active minutes today: ${Math.round(input.todayActiveMinutes + (isActiveMin ? input.quantity : 0))}/600` : "Over 10h of activity in one day is not credible" });
  if (!c5) flags.push({ code: "IMPOSSIBLE_DAY", message: "Total active minutes exceed 600/day — exceeds human plausibility." });

  // 6. Time plausibility per activity
  const hour = input.now.getHours();
  let c6 = true;
  let c6detail = "No time restriction";
  if (input.activityKey === "sunlight" && (hour < 5 || hour > 11)) { c6 = false; c6detail = `Logged at ${hour}:00 — morning sunlight only counts 5–11am`; }
  if (input.activityKey === "sleep" && hour >= 12 && hour <= 17) { c6 = false; c6detail = `Logged at ${hour}:00 — sleep claims mid-day need a paired check-in`; }
  checks.push({ name: "Time plausibility", passed: c6, detail: c6detail });
  if (!c6) flags.push({ code: "IMPLAUSIBLE_TIME", message: c6detail });

  // 7. Bot pattern (last 5 identical quantities)
  const rq = input.recentQuantities;
  const c7 = !(rq.length >= 5 && rq.slice(-5).every((q) => q === rq[rq.length - 1]) && input.quantity === rq[rq.length - 1]);
  checks.push({ name: "Bot pattern", passed: c7, detail: c7 ? "Quantity varies naturally" : "6 identical quantities in a row — scripted pattern" });
  if (!c7) flags.push({ code: "BOT_PATTERN", message: "Identical quantities repeated — looks automated." });

  // 8. New-account spike (>1200 pts on day 0–1)
  const c8 = !(input.accountAgeDays <= 1 && input.firstDayPoints > 1200);
  checks.push({ name: "New-account spike", passed: c8, detail: c8 ? "Earning curve normal" : `${input.firstDayPoints} pts on a new account — held for review` });
  if (!c8) flags.push({ code: "NEW_ACCOUNT_SPIKE", message: "Unusually high day-one earnings. Points held until evidence added." });

  const passed = flags.length === 0;
  return { passed, level: passed ? "plausible" : "self", flags, checks };
}

// Trust tiers
export function trustTier(score: number): { label: string; color: string; desc: string } {
  if (score >= 90) return { label: "Champion", color: "#7c3aed", desc: "Top 5%. Evidence fast-laned, eligible for biggest prize pools." };
  if (score >= 70) return { label: "Trusted", color: "#15803d", desc: "Full challenge access. Occasional spot-checks only." };
  if (score >= 40) return { label: "Building", color: "#0e7490", desc: "Standard access. Add evidence to climb faster." };
  return { label: "New / Watch", color: "#b45309", desc: "Challenge points capped until trust builds. Verify 3 logs to graduate." };
}

export function proofFor(key: string): ActivityProof | undefined {
  return ACTIVITY_PROOFS.find((p) => p.key === key);
}
