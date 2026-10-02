"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Footprints, Droplets, Moon, Flame, Plus, Trophy, Lightbulb, History,
  TrendingUp, Music, Home, ShoppingBag, Sprout, Bike, Timer, Salad,
  Wind, Ban, Sun, Activity, Zap, Check, X, Sparkles, Phone, ChevronRight,
  ShieldCheck, ShieldAlert, Camera, Users, BadgeCheck, AlertTriangle, Star,
} from "lucide-react";
import { scoreFromLogs, vitalityBand, bandColor, weeklyTarget, coachMessage } from "@/lib/vitality";
import { LEVEL_META, proofFor, trustTier, type VerificationLevel } from "@/lib/verification";

type Act = { id: number; key: string; title: string; category: string; description: string; pointsPerUnit: number; unit: string; caloriesPerUnit: number; icon: string };
type Log = {
  id: number; subscriberId: number; activityId: number; quantity: number; steps: number;
  pointsEarned: number; verifiedPoints: number; calories: number; mood: string | null;
  loggedAt: string; activity: Act | null;
  verificationLevel: VerificationLevel; verificationMethod: string;
  flagged: boolean; flagCodes: string[]; flagReason: string | null; evidenceCount: number;
};
type Challenge = { id: number; title: string; description: string; category: string; targetPoints: number; durationDays: number; reward: string; icon: string; participants: number };
type Tip = { id: number; category: string; title: string; body: string; readMins: number };
type Screening = { passed: boolean; level: VerificationLevel; flags: { code: string; message: string }[]; checks: { name: string; passed: boolean; detail: string }[]; trustDelta: number };
type Trust = { score: number; verified: number; plausible: number; flagged: number; total: number; challengePts: number; verificationRate: number };

const ICONS: Record<string, typeof Activity> = {
  footprints: Footprints, "trending-up": TrendingUp, home: Home, "shopping-bag": ShoppingBag,
  music: Music, sprout: Sprout, bike: Bike, timer: Timer, droplets: Droplets, salad: Salad,
  moon: Moon, wind: Wind, ban: Ban, sun: Sun, activity: Activity, trophy: Trophy,
};
const MOODS = ["😫", "😕", "🙂", "😄", "🔥"];
const getIcon = (n: string) => ICONS[n] ?? Activity;

function LevelBadge({ level, flagged }: { level: VerificationLevel; flagged?: boolean }) {
  const m = LEVEL_META[level] ?? LEVEL_META.self;
  if (flagged) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black text-red-700">
        <ShieldAlert size={11} /> FLAGGED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: m.bg, color: m.color }}>
      {level === "self" ? <Activity size={11} /> : level === "plausible" ? <Check size={11} /> : level === "verified" ? <BadgeCheck size={11} /> : <Star size={11} />}
      {m.label.toUpperCase()}
    </span>
  );
}

export default function WellnessApp() {
  const [msisdnInput, setMsisdnInput] = useState("");
  const [subscriber, setSubscriber] = useState<{ id: number; msisdn: string; operator: string; displayName: string | null } | null>(null);
  const [activities, setActivities] = useState<Act[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [tab, setTab] = useState<"today" | "log" | "challenges" | "trust" | "tips" | "history">("today");
  const [filter, setFilter] = useState("All");
  const [sheet, setSheet] = useState<Act | null>(null);
  const [qty, setQty] = useState(10);
  const [mood, setMood] = useState("🙂");
  const [joined, setJoined] = useState<number[]>([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [showScreening, setShowScreening] = useState(false);
  const [verifyLog, setVerifyLog] = useState<Log | null>(null);
  const [evMethod, setEvMethod] = useState("photo");
  const [evDetail, setEvDetail] = useState("");
  const [evWitness, setEvWitness] = useState("");
  const [trust, setTrust] = useState<Trust | null>(null);

  useEffect(() => {
    fetch("/api/seed", { method: "POST" }).then(() => {
      fetch("/api/activities").then((r) => r.json()).then((d) => d.ok && setActivities(d.activities));
      fetch("/api/challenges").then((r) => r.json()).then((d) => d.ok && setChallenges(d.challenges));
      fetch("/api/tips").then((r) => r.json()).then((d) => d.ok && setTips(d.tips));
    });
    const saved = localStorage.getItem("vl_msisdn");
    if (saved) login(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshTrust(subId: number) {
    const r = await fetch(`/api/verify?subscriberId=${subId}`);
    const d = await r.json();
    if (d.ok && d.trust) setTrust(d.trust);
  }

  async function login(msisdn: string) {
    if (!msisdn.trim()) return;
    setLoading(true);
    try {
      const r = await fetch("/api/subscribers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ msisdn }) });
      const d = await r.json();
      if (d.ok) {
        setSubscriber(d.subscriber);
        localStorage.setItem("vl_msisdn", d.subscriber.msisdn);
        const lr = await fetch(`/api/logs?subscriberId=${d.subscriber.id}`);
        const ld = await lr.json();
        if (ld.ok) setLogs(ld.logs);
        refreshTrust(d.subscriber.id);
        setToast(d.created ? `Welcome! Profile created on ${d.subscriber.operator}` : `Welcome back! Synced ${ld.logs?.length ?? 0} logs`);
      }
    } finally { setLoading(false); }
  }

  async function submitLog() {
    if (!subscriber || !sheet) return;
    const r = await fetch("/api/logs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriberId: subscriber.id, activityId: sheet.id, quantity: qty, mood }),
    });
    const d = await r.json();
    if (d.ok) {
      setLogs((l) => [d.log, ...l]);
      setSheet(null);
      setScreening(d.screening);
      setShowScreening(true);
      refreshTrust(subscriber.id);
      setToast(d.screening.passed
        ? `+${d.log.pointsEarned} pts ✓ Plausible — counts toward challenges`
        : `Logged but FLAGGED — ${d.screening.flags[0]?.code}. Add evidence to restore.`);
      setTab("today");
    }
  }

  async function submitEvidence() {
    if (!subscriber || !verifyLog) return;
    const r = await fetch("/api/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId: verifyLog.id, subscriberId: subscriber.id, method: evMethod, detail: evDetail, witnessMsisdn: evWitness || undefined }),
    });
    const d = await r.json();
    if (d.ok) {
      setLogs((ls) => ls.map((l) => (l.id === verifyLog.id ? { ...l, ...d.log, activity: l.activity } : l)));
      setVerifyLog(null); setEvDetail(""); setEvWitness("");
      refreshTrust(subscriber.id);
      setToast(d.newLevel === "certified" ? `◆ CERTIFIED! +${d.newVerifiedPoints} challenge pts (25% bonus)` : `★ VERIFIED! +${d.newVerifiedPoints} challenge pts restored`);
    } else {
      setToast(d.error || "Evidence rejected");
    }
  }

  async function joinChallenge(id: number) {
    if (!subscriber) { setToast("Enter your phone number first to join challenges"); return; }
    const r = await fetch("/api/challenges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId: id, subscriberId: subscriber.id }) });
    const d = await r.json();
    if (d.ok) { setJoined((j) => [...j, id]); setToast("Challenge joined — only verified points count toward prizes!"); }
  }

  const scores = useMemo(() => scoreFromLogs(logs), [logs]);
  const band = vitalityBand(scores.week);
  const coach = useMemo(() => coachMessage(scores.today, scores.streak, band), [scores, band]);
  const verifiedWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    return logs.filter((l) => new Date(l.loggedAt).getTime() >= weekAgo).reduce((s, l) => s + (l.verifiedPoints ?? 0), 0);
  }, [logs]);
  const catTotals = useMemo(() => {
    const m: Record<string, number> = {};
    const weekAgo = Date.now() - 7 * 86400000;
    for (const l of logs) {
      if (new Date(l.loggedAt).getTime() < weekAgo) continue;
      const c = l.activity?.category ?? "Move";
      m[c] = (m[c] ?? 0) + l.pointsEarned;
    }
    return m;
  }, [logs]);
  const weekBars = weeklyTarget(catTotals);
  const calories = logs.filter((l) => new Date(l.loggedAt).toDateString() === new Date().toDateString()).reduce((s, l) => s + l.calories, 0);
  const categories = ["All", ...Array.from(new Set(activities.map((a) => a.category)))];
  const visibleActs = filter === "All" ? activities : activities.filter((a) => a.category === filter);
  const tier = trustTier(trust?.score ?? 50);

  const last7 = useMemo(() => {
    const days: { label: string; pts: number; vpts: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const dayLogs = logs.filter((l) => new Date(l.loggedAt).toISOString().slice(0, 10) === key);
      days.push({
        label: d.toLocaleDateString("en", { weekday: "short" }),
        pts: dayLogs.reduce((s, l) => s + l.pointsEarned, 0),
        vpts: dayLogs.reduce((s, l) => s + (l.verifiedPoints ?? 0), 0),
      });
    }
    return days;
  }, [logs]);
  const max7 = Math.max(60, ...last7.map((d) => d.pts));

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <div className="bg-[#071120] pb-20 pt-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">VitalLoop Wellness • Verified</p>
              <h1 className="text-2xl font-black text-white sm:text-3xl">
                {subscriber ? `Hello, ${subscriber.msisdn} 👋` : "Your everyday health companion"}
              </h1>
              <p className="text-sm text-slate-400">
                {subscriber ? `On ${subscriber.operator} • ${band} band • ${scores.streak}-day streak • Trust ${trust?.score ?? 50}/100` : "Log in with your phone number to start earning Vitality Points"}
              </p>
            </div>
            {!subscriber ? (
              <div className="flex w-full max-w-md gap-2">
                <div className="relative flex-1">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={msisdnInput} onChange={(e) => setMsisdnInput(e.target.value)} placeholder="e.g. 08031234567"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-9 pr-3 text-sm font-bold text-white placeholder:text-slate-500" />
                </div>
                <button onClick={() => login(msisdnInput)} disabled={loading} className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white hover:bg-emerald-400 disabled:opacity-60">
                  {loading ? "…" : "Start"}
                </button>
              </div>
            ) : trust && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5">
                <ShieldCheck size={22} style={{ color: tier.color === "#b45309" ? "#fbbf24" : tier.color }} className="brightness-150" />
                <div>
                  <p className="text-sm font-black text-white">Trust {trust.score}/100 • {tier.label}</p>
                  <p className="text-[11px] text-slate-300">{trust.verificationRate}% logs verified • {trust.challengePts.toLocaleString()} challenge pts</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-14 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Today</p>
              <Zap size={16} className="text-amber-500" />
            </div>
            <p className="mt-1 text-4xl font-black text-slate-900">{scores.today}<span className="text-base font-bold text-slate-400"> pts</span></p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${Math.min(100, (scores.today / 200) * 100)}%` }} />
            </div>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">Daily goal: 200 pts</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">7-day score</p>
              <Flame size={16} className="text-orange-500" />
            </div>
            <p className="mt-1 text-4xl font-black text-slate-900">{scores.week}<span className="text-base font-bold text-slate-400"> pts</span></p>
            <span className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-black text-white" style={{ background: bandColor(band) }}>{band}</span>
          </div>
          <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Verified (7d)</p>
              <BadgeCheck size={16} className="text-emerald-600" />
            </div>
            <p className="mt-1 text-4xl font-black text-emerald-800">{verifiedWeek}<span className="text-base font-bold text-emerald-500"> pts</span></p>
            <p className="mt-2 text-[11px] font-semibold text-emerald-700">Only these count toward challenge prizes 🏆</p>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg">
            <div className="flex items-center gap-2">
              <Sparkles size={16} /><p className="text-xs font-black uppercase tracking-widest text-emerald-100">Coach nudge</p>
            </div>
            <p className="mt-2 text-sm font-semibold leading-relaxed">{coach}</p>
            <p className="mt-2 text-[11px] text-emerald-100">🔥 {Math.round(calories)} kcal from everyday movement today</p>
          </div>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto">
          {([["today", "Today", Activity], ["log", "Log activity", Plus], ["challenges", "Challenges", Trophy], ["trust", "Trust & Proof", ShieldCheck], ["tips", "Learn", Lightbulb], ["history", "History", History]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black ${tab === id ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-200"}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {tab === "today" && (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow">
              <h3 className="font-extrabold text-slate-900">Last 7 days <span className="ml-1 text-xs font-normal text-slate-500">(dark = verified portion)</span></h3>
              <div className="mt-4 flex h-40 items-end gap-2">
                {last7.map((d, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
                    <span className="text-[10px] font-black text-slate-500">{d.pts > 0 ? d.pts : ""}</span>
                    <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-xl bg-slate-200" style={{ height: `${Math.max(6, (d.pts / max7) * 80)}%` }}>
                      <div className={`${i === 6 ? "bg-gradient-to-t from-emerald-600 to-emerald-400" : "bg-emerald-400"}`} style={{ height: `${d.pts ? (d.vpts / d.pts) * 100 : 0}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{d.label}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setTab("log")} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-black text-white hover:bg-emerald-600">
                <Plus size={16} /> Log an activity
              </button>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow">
              <h3 className="font-extrabold text-slate-900">Weekly balance wheel</h3>
              <p className="text-xs text-slate-500">Are you moving, fueling, resting and resetting?</p>
              <div className="mt-4 space-y-3">
                {weekBars.map((b) => (
                  <div key={b.category}>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">{b.category}</span>
                      <span className="text-slate-400">{b.actual}/{b.target} pts • {b.pct}%</span>
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${b.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow lg:col-span-2">
              <h3 className="font-extrabold text-slate-900">Today&apos;s timeline</h3>
              {logs.filter((l) => new Date(l.loggedAt).toDateString() === new Date().toDateString()).length === 0 ? (
                <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Nothing logged yet today. Your streak needs just one log — a glass of water counts. 💧</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {logs.filter((l) => new Date(l.loggedAt).toDateString() === new Date().toDateString()).map((l) => {
                    const I = getIcon(l.activity?.icon ?? "activity");
                    return (
                      <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><I size={18} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">{l.activity?.title} <span className="font-normal text-slate-500">× {l.quantity} {l.activity?.unit}</span></p>
                          <p className="text-xs text-slate-500">{new Date(l.loggedAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })} • {l.mood} • {Math.round(l.calories)} kcal</p>
                          {l.flagged && l.flagReason && <p className="mt-1 truncate text-[11px] font-semibold text-red-600">⚠ {l.flagReason}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <LevelBadge level={l.verificationLevel} flagged={l.flagged} />
                          <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-white">+{l.pointsEarned}</span>
                        </div>
                        {(l.flagged || l.verificationLevel === "plausible" || l.verificationLevel === "self") && (
                          <button onClick={() => { setVerifyLog(l); const p = l.activity ? proofFor(l.activity.key) : undefined; setEvMethod(p?.methods[0]?.method ?? "photo"); }}
                            className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-black text-white hover:bg-slate-700">
                            {l.flagged ? "Fix with proof" : "Verify ★"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "log" && (
          <div className="mt-5">
            {!subscriber && (
              <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                Enter your phone number above first — your logs are tied to your MSISDN so streaks survive phone changes.
              </div>
            )}
            <div className="mb-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-relaxed text-cyan-900">
              <strong>🛡 Every log is fraud-screened instantly</strong> (8 checks: caps, velocity, duplicates, impossible days, time windows, bot patterns).
              Pass → <strong>Plausible ✓</strong> (counts toward challenges). Add photo/timer/peer proof → <strong>Verified ★</strong>. Two proofs → <strong>Certified ◆ +25%</strong>.
              Try logging something absurd (e.g. 200 min stairs) to watch the engine catch it.
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((c) => (
                <button key={c} onClick={() => setFilter(c)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${filter === c ? "bg-emerald-500 text-white" : "bg-white text-slate-600"}`}>{c}</button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleActs.map((a) => {
                const I = getIcon(a.icon);
                const proof = proofFor(a.key);
                return (
                  <button key={a.id} onClick={() => { setSheet(a); setQty(a.unit === "glass" ? 2 : a.unit === "meal" || a.unit === "session" || a.unit === "swap" ? 1 : 10); }}
                    className="card-hover rounded-3xl border border-slate-200 bg-white p-5 text-left">
                    <div className="flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-emerald-300"><I size={20} /></span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">{a.pointsPerUnit} pts/{a.unit}</span>
                    </div>
                    <p className="mt-3 text-sm font-extrabold text-slate-900">{a.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{a.description}</p>
                    {proof && (
                      <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-cyan-700">
                        <ShieldCheck size={12} /> Prove via: {proof.primary}
                      </p>
                    )}
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-black text-emerald-600">Log this <ChevronRight size={14} /></p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "challenges" && (
          <div className="mt-5">
            <div className="mb-4 rounded-2xl bg-slate-900 p-4 text-sm text-slate-200">
              <p className="font-black text-white">🏆 Challenges run on <span className="text-emerald-300">verified points only</span></p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Self-logged & flagged logs earn personal score but <strong className="text-white">zero challenge progress</strong>.
                Your verified 7-day total is <strong className="text-emerald-300">{verifiedWeek.toLocaleString()} pts</strong>.
                Every activity can become a challenge — each uses its own proof method (meal photos for nutrition, timers for movement, check-in pairs for sleep).
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {challenges.map((c) => {
                const I = getIcon(c.icon);
                const isJoined = joined.includes(c.id);
                const pct = Math.min(100, Math.round((verifiedWeek / c.targetPoints) * 100));
                return (
                  <div key={c.id} className="card-hover rounded-3xl border border-slate-200 bg-white p-6">
                    <div className="flex items-start justify-between">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white"><I size={22} /></span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">{c.participants.toLocaleString()} in</span>
                    </div>
                    <h3 className="mt-3 font-extrabold text-slate-900">{c.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{c.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">🎯 {c.targetPoints} verified pts</span>
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">📅 {c.durationDays} days</span>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">🎁 {c.reward}</span>
                    </div>
                    {isJoined && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[11px] font-black">
                          <span className="text-emerald-700">YOUR VERIFIED PROGRESS</span>
                          <span className="text-slate-500">{Math.min(verifiedWeek, c.targetPoints)}/{c.targetPoints} • {pct}%</span>
                        </div>
                        <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    <button onClick={() => joinChallenge(c.id)} disabled={isJoined}
                      className={`mt-4 w-full rounded-2xl py-3 text-sm font-black ${isJoined ? "bg-emerald-100 text-emerald-700" : "bg-slate-900 text-white hover:bg-slate-700"}`}>
                      {isJoined ? `✓ Joined — ${pct}% there on verified pts` : "Join challenge (verified pts count)"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "trust" && (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl bg-slate-900 p-6 text-white">
              <h3 className="flex items-center gap-2 font-extrabold"><ShieldCheck size={18} className="text-emerald-300" /> Your Trust Passport</h3>
              {!subscriber ? (
                <p className="mt-3 text-sm text-slate-300">Enter your phone number to mint your trust profile.</p>
              ) : trust ? (
                <>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="relative grid h-28 w-28 shrink-0 place-items-center">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke={tier.color} strokeWidth="10" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - trust.score / 100)} />
                      </svg>
                      <div className="text-center"><p className="text-2xl font-black">{trust.score}</p><p className="text-[10px] text-slate-400">/ 100</p></div>
                    </div>
                    <div>
                      <span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: tier.color, color: "#fff" }}>{tier.label}</span>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">{tier.desc}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    {[["Total", trust.total], ["Plausible", trust.plausible], ["Verified", trust.verified], ["Flagged", trust.flagged]].map(([l, v]) => (
                      <div key={l as string} className="rounded-2xl bg-white/5 p-3">
                        <p className="text-xl font-black">{v as number}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{l as string}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-2xl bg-white/5 p-3 text-xs leading-relaxed text-slate-300">
                    <strong className="text-white">How trust moves:</strong> +1 per plausible log, +2 per verified, +4 per certified, −8 per flagged.
                    New accounts start at 50. Challenges with big prizes require Trust ≥ 40.
                  </div>
                </>
              ) : <p className="mt-3 text-sm text-slate-300">Loading trust…</p>}
            </div>
            <div className="rounded-3xl bg-white p-6 shadow">
              <h3 className="font-extrabold text-slate-900">The 4 verification levels</h3>
              <div className="mt-3 space-y-2.5">
                {(Object.keys(LEVEL_META) as VerificationLevel[]).map((lv) => {
                  const m = LEVEL_META[lv];
                  return (
                    <div key={lv} className="rounded-2xl border border-slate-100 p-3.5" style={{ borderLeft: `5px solid ${m.color}` }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-extrabold" style={{ color: m.color }}>{m.label}</p>
                        <span className="text-[11px] font-black text-slate-500">
                          {lv === "self" ? "0% challenge value" : lv === "certified" ? "125% challenge value" : "100% challenge value"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{m.desc}</p>
                    </div>
                  );
                })}
              </div>
              <a href="/verification" className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-sm font-black text-white hover:bg-slate-700">
                Full verification playbook <ChevronRight size={16} />
              </a>
            </div>
          </div>
        )}

        {tab === "tips" && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {tips.map((t) => (
              <article key={t.id} className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-teal-700">{t.category}</span>
                  <span className="text-[11px] font-semibold text-slate-400">{t.readMins} min read</span>
                </div>
                <h3 className="mt-2 font-extrabold text-slate-900">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.body}</p>
              </article>
            ))}
          </div>
        )}

        {tab === "history" && (
          <div className="mt-5 rounded-3xl bg-white p-6 shadow">
            <h3 className="font-extrabold text-slate-900">All logs ({logs.length}) — with verification status</h3>
            <div className="mt-3 space-y-2">
              {logs.map((l) => {
                const I = getIcon(l.activity?.icon ?? "activity");
                return (
                  <div key={l.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${l.flagged ? "border-red-200 bg-red-50/50" : "border-slate-100"}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><I size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{l.activity?.title ?? "Activity"} × {l.quantity}</p>
                      <p className="text-xs text-slate-500">{new Date(l.loggedAt).toLocaleString()} • {l.mood} • challenge: +{l.verifiedPoints ?? 0}</p>
                      {l.flagged && <p className="truncate text-[11px] font-semibold text-red-600">⚠ {l.flagReason}</p>}
                      {l.evidenceCount > 0 && <p className="text-[11px] font-bold text-emerald-700">📎 {l.evidenceCount} evidence attached • {l.verificationMethod}</p>}
                    </div>
                    <LevelBadge level={l.verificationLevel} flagged={l.flagged} />
                    {(l.flagged || l.verificationLevel !== "certified") && (
                      <button onClick={() => { setVerifyLog(l); const p = l.activity ? proofFor(l.activity.key) : undefined; setEvMethod(p?.methods[0]?.method ?? "photo"); }}
                        className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-black text-white">+ Proof</button>
                    )}
                  </div>
                );
              })}
              {logs.length === 0 && <p className="text-sm text-slate-500">No logs yet — switch to “Log activity” to start.</p>}
            </div>
          </div>
        )}
      </div>

      {/* Log sheet */}
      {sheet && (
        <div className="fixed inset-0 z-[60] grid place-items-end bg-black/60 p-0 sm:place-items-center sm:p-6" onClick={() => setSheet(null)}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-600">{sheet.category} • {sheet.pointsPerUnit} pts/{sheet.unit}</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{sheet.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{sheet.description}</p>
                {(() => { const p = proofFor(sheet.key); return p ? (
                  <p className="mt-2 rounded-xl bg-cyan-50 p-2.5 text-[11px] font-semibold leading-relaxed text-cyan-900">
                    🛡 Proof for challenges: <strong>{p.primary}</strong> • cap {p.dailyCap} • fraud risk: {p.fraudRisk}
                  </p>
                ) : null; })()}
              </div>
              <button onClick={() => setSheet(null)} className="rounded-full bg-slate-100 p-2 text-slate-500"><X size={16} /></button>
            </div>
            <div className="mt-4">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">How much? ({sheet.unit})</label>
              <div className="mt-2 flex items-center gap-3">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-xl font-black">−</button>
                <input type="number" value={qty} min={1} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-2xl border border-slate-200 py-3 text-center text-2xl font-black" />
                <button onClick={() => setQty((q) => q + 1)} className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-xl font-black text-white">+</button>
              </div>
              <div className="mt-2 flex gap-2">
                {[5, 10, 20, 30].map((v) => (
                  <button key={v} onClick={() => setQty(v)} className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-black text-slate-600">{v}</button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">How did it feel?</label>
              <div className="mt-2 flex gap-2">
                {MOODS.map((m) => (
                  <button key={m} onClick={() => setMood(m)} className={`grid h-12 flex-1 place-items-center rounded-2xl text-2xl ${mood === m ? "bg-emerald-100 ring-2 ring-emerald-500" : "bg-slate-100"}`}>{m}</button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-50 p-4">
              <span className="text-sm font-bold text-emerald-800">You&apos;ll earn</span>
              <span className="text-2xl font-black text-emerald-600">+{sheet.pointsPerUnit * qty} pts</span>
            </div>
            <button onClick={submitLog} disabled={!subscriber} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-sm font-black text-white hover:bg-emerald-600 disabled:opacity-50">
              <Check size={18} /> {subscriber ? "Confirm log (auto-screened)" : "Enter phone number first"}
            </button>
          </div>
        </div>
      )}

      {/* Screening result modal */}
      {showScreening && screening && (
        <div className="fixed inset-0 z-[65] grid place-items-center bg-black/60 p-4" onClick={() => setShowScreening(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className={`rounded-2xl p-4 text-center ${screening.passed ? "bg-emerald-50" : "bg-red-50"}`}>
              {screening.passed
                ? <BadgeCheck size={36} className="mx-auto text-emerald-600" />
                : <AlertTriangle size={36} className="mx-auto text-red-500" />}
              <h3 className="mt-2 text-lg font-black text-slate-900">
                {screening.passed ? "Passed all 8 fraud checks ✓" : `Flagged: ${screening.flags.length} check(s) failed`}
              </h3>
              <p className="text-xs text-slate-600">
                {screening.passed
                  ? "Level: Plausible ✓ — full challenge points earned. Add evidence for ★/◆ bonus."
                  : "Level: Self-logged — personal score kept, challenge points withheld until you add proof."}
              </p>
            </div>
            <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
              {screening.checks.map((c) => (
                <div key={c.name} className="flex items-start gap-2 rounded-xl bg-slate-50 p-2.5">
                  {c.passed ? <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" /> : <X size={14} className="mt-0.5 shrink-0 text-red-500" />}
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">{c.name}</p>
                    <p className="text-[11px] text-slate-500">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowScreening(false)} className="mt-4 w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-black text-white">Got it</button>
          </div>
        </div>
      )}

      {/* Evidence modal */}
      {verifyLog && (
        <div className="fixed inset-0 z-[65] grid place-items-end bg-black/60 sm:place-items-center sm:p-4" onClick={() => setVerifyLog(null)}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Attach proof</p>
                <h3 className="mt-1 text-lg font-black text-slate-900">{verifyLog.activity?.title} × {verifyLog.quantity}</h3>
                <p className="text-xs text-slate-500">+{verifyLog.pointsEarned} pts at stake • currently {LEVEL_META[verifyLog.verificationLevel]?.label}</p>
              </div>
              <button onClick={() => setVerifyLog(null)} className="rounded-full bg-slate-100 p-2 text-slate-500"><X size={16} /></button>
            </div>
            {(() => {
              const p = verifyLog.activity ? proofFor(verifyLog.activity.key) : undefined;
              return p ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-bold text-slate-600">Recommended proof for this activity:</p>
                  {p.methods.map((m) => (
                    <button key={m.method} onClick={() => setEvMethod(m.method)}
                      className={`w-full rounded-2xl border-2 p-3 text-left ${evMethod === m.method ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-slate-50"}`}>
                      <p className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                        {m.method === "photo" ? <Camera size={14} /> : m.method === "peer" ? <Users size={14} /> : m.method === "timer" ? <Timer size={14} /> : <BadgeCheck size={14} />}
                        {m.label}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{m.how}</p>
                    </button>
                  ))}
                </div>
              ) : null;
            })()}
            <textarea value={evDetail} onChange={(e) => setEvDetail(e.target.value)}
              placeholder="Describe your evidence: e.g. 'Photo of my ugu + rice plate at lunch, half greens…' (min 8 chars)"
              className="mt-3 w-full rounded-2xl border border-slate-200 p-3 text-sm" rows={3} />
            {evMethod === "peer" && (
              <input value={evWitness} onChange={(e) => setEvWitness(e.target.value)} placeholder="Witness phone number e.g. 0803…"
                className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm font-bold" />
            )}
            <div className="mt-2 rounded-2xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
              1st proof → <strong>Verified ★</strong> (full challenge pts + Trust +2). 2nd distinct method → <strong>Certified ◆</strong> (+25% bonus + Trust +4).
            </div>
            <button onClick={submitEvidence} disabled={evDetail.trim().length < 8} className="mt-3 w-full rounded-2xl bg-emerald-500 py-4 text-sm font-black text-white disabled:opacity-40">
              Submit proof
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] max-w-[94vw] -translate-x-1/2">
          <div className="tick flex items-center gap-3 rounded-2xl bg-slate-900 py-3 pl-4 pr-5 text-sm font-bold text-white shadow-2xl">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500"><Check size={16} /></span>
            <span className="break-words">{toast}</span>
            <button onClick={() => setToast("")} className="text-slate-400"><X size={14} /></button>
          </div>
        </div>
      )}
    </main>
  );
}
