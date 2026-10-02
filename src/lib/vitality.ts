export type VitalityBand = "Dormant" | "Waking" | "Active" | "Athletic" | "Elite";

export function vitalityBand(score: number): VitalityBand {
  if (score >= 800) return "Elite";
  if (score >= 550) return "Athletic";
  if (score >= 320) return "Active";
  if (score >= 120) return "Waking";
  return "Dormant";
}

export function bandColor(band: VitalityBand): string {
  switch (band) {
    case "Elite": return "#a855f7";
    case "Athletic": return "#10b981";
    case "Active": return "#22c55e";
    case "Waking": return "#f59e0b";
    default: return "#64748b";
  }
}

export function scoreFromLogs(logs: { pointsEarned: number; loggedAt: string | Date }[]): {
  today: number; week: number; total: number; streak: number;
} {
  const now = new Date();
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const todayKey = dayKey(now);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  let today = 0, week = 0, total = 0;
  const activeDays = new Set<string>();
  for (const l of logs) {
    const d = new Date(l.loggedAt);
    total += l.pointsEarned;
    if (d >= weekAgo) week += l.pointsEarned;
    if (dayKey(d) === todayKey) today += l.pointsEarned;
    if (l.pointsEarned > 0) activeDays.add(dayKey(d));
  }
  // streak: consecutive days ending today or yesterday
  let streak = 0;
  const cursor = new Date(now);
  if (!activeDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeDays.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 365) break;
  }
  return { today, week, total, streak };
}

export function weeklyTarget(categoryTotals: Record<string, number>) {
  const targets: Record<string, number> = { Move: 300, Fuel: 200, Rest: 150, Mind: 120, Strength: 150, Mobility: 80 };
  return Object.entries(targets).map(([cat, target]) => ({
    category: cat,
    target,
    actual: categoryTotals[cat] ?? 0,
    pct: Math.min(100, Math.round(((categoryTotals[cat] ?? 0) / target) * 100)),
  }));
}

export function coachMessage(today: number, streak: number, band: VitalityBand): string {
  if (today === 0 && streak === 0) return "Welcome! Log your first everyday activity — even a 10-min walk or 2 glasses of water — to wake up your Vitality Score.";
  if (today === 0) return `You're on a ${streak}-day streak — don't break it. A 2-min movement snack keeps it alive.`;
  if (today < 60) return "Good start. Add one more everyday win — stairs instead of lift, or half-plate veggies — to hit 60+ today.";
  if (today < 150) return "Solid day! You're in the Active zone. One evening walk or breathing reset pushes you toward Athletic.";
  if (band === "Athletic" || band === "Elite") return "Outstanding — elite everyday athlete. Protect your sleep tonight to bank these gains.";
  return "Great momentum. Consistency beats intensity — show up again tomorrow.";
}
