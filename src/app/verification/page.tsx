"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, ShieldAlert, Camera, Users, Timer, BadgeCheck, Star, Activity,
  Check, X, ChevronRight, Trophy, Fingerprint, Scale, GitBranch, Smartphone,
  AlertTriangle, Sparkles, ArrowRight,
} from "lucide-react";
import { ACTIVITY_PROOFS, LEVEL_META, trustTier, type VerificationLevel } from "@/lib/verification";

type Fraud = {
  total: number; flagged: number; plausible: number; verified: number;
  flagRate: number; byCode: { code: string; c: number }[]; byLevel: { level: string; c: number }[];
};

const CHECKS = [
  { name: "Per-log cap", ex: "Stairs max 15 min/log. A 200-min stairs log is physically absurd → flagged.", icon: Scale },
  { name: "Daily cap", ex: "Water max 15 glasses/day. 40 glasses = spam → held.", icon: Scale },
  { name: "Velocity guard", ex: "Max 8 logs/hour. 20 logs in 10 min = bot burst → flagged.", icon: Timer },
  { name: "Duplicate spacing", ex: "Same activity twice within 5 min → merged/flagged.", icon: GitBranch },
  { name: "Impossible-day ceiling", ex: ">600 active minutes in one day exceeds human plausibility → flagged.", icon: AlertTriangle },
  { name: "Time plausibility", ex: "'Morning sunlight' logged at 9pm, or sleep at 2pm without check-in pair → implausible.", icon: Smartphone },
  { name: "Bot-pattern detector", ex: "6 identical quantities in a row (10,10,10…) looks scripted → flagged.", icon: Fingerprint },
  { name: "New-account spike", ex: ">1,200 pts on day 0–1 → points held until evidence is added.", icon: ShieldAlert },
];

const ARCHITECTURE = [
  { t: "1. Claim (self-log)", d: "Subscriber taps an activity + quantity. Instantly stored as Self-logged — personal score updates so the loop feels alive, but challenge progress stays at zero.", c: "#64748b" },
  { t: "2. Screen (8 auto-checks)", d: "In <100ms the engine runs caps, velocity, spacing, impossible-day, time-window, bot-pattern and spike checks. Pass all → Plausible ✓ with full challenge points. Fail any → stays Self + flagged with reason codes.", c: "#0e7490" },
  { t: "3. Prove (evidence)", d: "Subscriber attaches the activity's natural proof: meal photo, walk timer, sleep check-in pair, peer witness. 1 method → Verified ★ (flags cleared, points restored). 2 distinct methods → Certified ◆ (+25% bonus).", c: "#15803d" },
  { t: "4. Trust (reputation)", d: "Every outcome moves a 0–100 Trust Score: +1 plausible, +2 verified, +4 certified, −8 flagged. High-trust users get fast lanes and big prize pools; low-trust users face caps and spot-checks.", c: "#7c3aed" },
];

export default function VerificationPage() {
  const [fraud, setFraud] = useState<Fraud | null>(null);
  const [filter, setFilter] = useState<"All" | "Low" | "Medium" | "High">("All");
  const [expanded, setExpanded] = useState<string | null>("veg-plate");
  const [demoQty, setDemoQty] = useState(200);
  const [demoAct, setDemoAct] = useState("stair-climb");

  useEffect(() => {
    fetch("/api/fraud").then((r) => r.json()).then((d) => d.ok && setFraud(d.fraud)).catch(() => {});
  }, []);

  const visible = filter === "All" ? ACTIVITY_PROOFS : ACTIVITY_PROOFS.filter((a) => a.fraudRisk === filter);

  const demoVerdict = (() => {
    const caps: Record<string, number> = { "stair-climb": 15, water: 4, "morning-walk": 90, sleep: 10, "veg-plate": 1, "house-chores": 60 };
    const cap = caps[demoAct] ?? 60;
    return demoQty > cap
      ? { pass: false, msg: `FLAGGED — ${demoQty} exceeds the ${cap} per-log cap for this activity. Split into realistic sessions or add timer proof.` }
      : { pass: true, msg: `PASSES per-log cap (${demoQty} ≤ ${cap}). It would still face the other 7 checks (daily cap, velocity, time window…).` };
  })();

  return (
    <main className="bg-slate-100 pb-20">
      <div className="vital-gradient pb-14 pt-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-emerald-200">
            <ShieldCheck size={14} /> Trust architecture • anti-fraud engine
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            How VitalLoop knows you actually did it.
          </h1>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-300">
            Yes — all <strong className="text-white">14 activities convert into challenges</strong>. And no — challenges don&apos;t trust taps.
            Every log flows through a 4-stage pipeline: <strong className="text-white">Claim → Screen → Prove → Trust</strong>.
            Self-logs feed your personal score; only <strong className="text-emerald-300">screened + evidenced points</strong> unlock prizes.
            This page is the full mechanism, live and inspectable.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/app" className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-white hover:bg-emerald-400">
              Try it: log something fake <ArrowRight size={16} />
            </Link>
            <a href="#matrix" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-black text-white hover:bg-white/10">
              The 14-activity proof matrix
            </a>
          </div>
          {fraud && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[["Logs screened", fraud.total], ["Plausible ✓", fraud.plausible], ["Verified ★/◆", fraud.verified], ["Flagged", fraud.flagged], ["Flag rate", fraud.flagRate + "%"]].map(([l, v]) => (
                <div key={l as string} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                  <p className="text-xl font-black text-white">{v as string | number}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{l as string}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-14 px-4 pt-10 sm:px-6">
        {/* Pipeline */}
        <section>
          <p className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-300">
            <GitBranch size={14} /> 01 • The pipeline
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Claim → Screen → Prove → Trust</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            The core design decision: <strong>never block logging</strong> (friction kills the habit), but <strong>always gate rewards</strong> (trust protects the prizes).
            Users get instant gratification; cheaters get instant irrelevance.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ARCHITECTURE.map((a) => (
              <div key={a.t} className="rounded-3xl bg-white p-5 shadow" style={{ borderTop: `5px solid ${a.c}` }}>
                <p className="font-extrabold text-slate-900">{a.t}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{a.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {(Object.keys(LEVEL_META) as VerificationLevel[]).map((lv) => {
              const m = LEVEL_META[lv];
              return (
                <div key={lv} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: m.bg, color: m.color }}>
                    {lv === "self" ? <Activity size={18} /> : lv === "plausible" ? <Check size={18} /> : lv === "verified" ? <BadgeCheck size={18} /> : <Star size={18} />}
                  </span>
                  <div>
                    <p className="text-sm font-extrabold" style={{ color: m.color }}>{m.label}</p>
                    <p className="text-[11px] font-bold text-slate-500">
                      {lv === "self" ? "0% challenge value" : lv === "certified" ? "125% value + bonus" : "100% challenge value"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 8 checks */}
        <section>
          <p className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-300">
            <ShieldAlert size={14} /> 02 • The 8 automatic fraud checks
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Every log screened in milliseconds, no human needed</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {CHECKS.map((c, i) => (
              <div key={c.name} className="flex gap-3 rounded-2xl bg-white p-4 shadow">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-emerald-300"><c.icon size={17} /></span>
                <div>
                  <p className="text-sm font-extrabold text-slate-900"><span className="text-slate-400">#{i + 1}</span> {c.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{c.ex}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive demo */}
          <div className="mt-5 rounded-3xl bg-slate-900 p-6 text-white">
            <p className="flex items-center gap-2 text-sm font-extrabold"><Sparkles size={16} className="text-amber-300" /> Try the fraud engine right here</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wide text-slate-400">Activity</label>
                <select value={demoAct} onChange={(e) => setDemoAct(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 p-3 text-sm font-bold">
                  <option value="stair-climb" className="text-slate-900">Stair climb (cap 15/log)</option>
                  <option value="morning-walk" className="text-slate-900">Morning walk (cap 90/log)</option>
                  <option value="house-chores" className="text-slate-900">House chores (cap 60/log)</option>
                  <option value="water" className="text-slate-900">Water (cap 4/log)</option>
                  <option value="veg-plate" className="text-slate-900">Veg plate (cap 1/log)</option>
                  <option value="sleep" className="text-slate-900">Sleep (cap 10/log)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wide text-slate-400">Claimed quantity: {demoQty}</label>
                <input type="range" min={1} max={250} value={demoQty} onChange={(e) => setDemoQty(Number(e.target.value))} className="mt-3 w-full" />
              </div>
              <div className={`rounded-2xl p-4 ${demoVerdict.pass ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                <p className={`flex items-center gap-2 text-sm font-black ${demoVerdict.pass ? "text-emerald-300" : "text-red-300"}`}>
                  {demoVerdict.pass ? <Check size={16} /> : <X size={16} />} {demoVerdict.pass ? "PASSES check #1" : "FAILS check #1"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{demoVerdict.msg}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Matrix */}
        <section id="matrix">
          <p className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-300">
            <Camera size={14} /> 03 • The proof matrix
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">All 14 activities → challenges, each with its own proof</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Your instinct is right: every activity becomes a challenge type. The key is that <strong>proof is native to the activity</strong> —
            food is proven by photos, movement by timers + sensors, sleep by paired check-ins, invisible habits by peer witnesses.
            Tap any row for the full mechanism.
          </p>
          <div className="mt-4 flex gap-2">
            {(["All", "Low", "Medium", "High"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-xs font-black ${filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>
                {f === "All" ? "All 14" : `${f} fraud risk`}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2.5">
            {visible.map((a) => {
              const open = expanded === a.key;
              return (
                <div key={a.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <button onClick={() => setExpanded(open ? null : a.key)} className="flex w-full items-center gap-3 p-4 text-left">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                      a.fraudRisk === "High" ? "bg-red-100 text-red-700" : a.fraudRisk === "Medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    }`}>{a.fraudRisk}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-slate-900">{a.key.replace(/-/g, " ")}</span>
                      <span className="block truncate text-xs text-slate-500">Prove via: {a.primary} • cap {a.dailyCap}</span>
                    </span>
                    <ChevronRight size={18} className={`shrink-0 text-slate-400 transition ${open ? "rotate-90" : ""}`} />
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-4">
                      <div className="grid gap-2.5 md:grid-cols-2">
                        {a.methods.map((m) => (
                          <div key={m.method} className="rounded-2xl bg-white p-3.5">
                            <p className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                              {m.method === "photo" ? <Camera size={14} className="text-sky-600" />
                                : m.method === "peer" ? <Users size={14} className="text-violet-600" />
                                : m.method === "timer" ? <Timer size={14} className="text-emerald-600" />
                                : m.method === "sensor" ? <Smartphone size={14} className="text-indigo-600" />
                                : <BadgeCheck size={14} className="text-amber-600" />}
                              {m.label}
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{m.method}</span>
                            </p>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{m.how}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2.5 rounded-xl bg-cyan-50 p-3 text-xs leading-relaxed text-cyan-900">
                        <strong>Why this works:</strong> {a.why}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Challenges + trust */}
        <section>
          <p className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-300">
            <Trophy size={14} /> 04 • Challenges & trust
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Prize integrity without killing the fun</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow">
              <h3 className="font-extrabold text-slate-900">How activities become challenges</h3>
              <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">
                <li><strong className="text-slate-900">1. One template per activity.</strong> “6K Steps Streak” (walk), “Soda-Free 14” (no-soda), “Sleep Wealth” (sleep)… each challenge inherits its activity&apos;s caps, time windows and proof methods automatically.</li>
                <li><strong className="text-slate-900">2. Verified-points leaderboard.</strong> Progress bars and rankings use <em>verifiedPoints</em>, never raw points. A user with 5,000 self-logged pts and 200 verified pts ranks at 200.</li>
                <li><strong className="text-slate-900">3. Proof-gated milestones.</strong> Small rewards (badges) unlock on plausible; airtime/data prizes require ≥1 verified log in the window; jackpot challenges require certified logs or peer witnesses.</li>
                <li><strong className="text-slate-900">4. Squad witnessing.</strong> Family/squad plans let members vouch for each other — the strongest low-tech verification in communal cultures. Fake-vouching burns <em>both</em> parties&apos; trust.</li>
              </ol>
            </div>
            <div className="rounded-3xl bg-slate-900 p-6 text-white">
              <h3 className="font-extrabold">The Trust Score (0–100)</h3>
              <div className="mt-3 space-y-2">
                {[90, 70, 40, 10].map((s) => {
                  const t = trustTier(s);
                  return (
                    <div key={s} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black text-white" style={{ background: t.color }}>{s}</span>
                      <div>
                        <p className="text-sm font-extrabold">{t.label}</p>
                        <p className="text-[11px] text-slate-400">{t.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 rounded-2xl bg-white/5 p-3 text-xs leading-relaxed text-slate-300">
                Movement: <strong className="text-white">+1</strong> plausible, <strong className="text-white">+2</strong> verified,
                <strong className="text-white"> +4</strong> certified, <strong className="text-red-300">−8</strong> flagged.
                Everyone starts at 50. It takes ~20 honest days to hit Trusted — and 3 fake jackpots to fall to Watch.
              </p>
            </div>
          </div>
        </section>

        {/* Honest limits */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-8 text-white">
          <h2 className="text-2xl font-black">The honest answer to “can&apos;t users still fake it?”</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-extrabold text-emerald-300">Yes — nothing is unfakeable</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                A determined user can photograph someone else&apos;s plate or shake their phone for steps.
                No consumer system (Strava, Apple Health, Sweatcoin) solves this perfectly — they manage it economically.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-extrabold text-emerald-300">So we make faking uneconomical</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Faking a 7-day challenge means 7+ staged photos, spaced timers, and a witness risking their own trust —
                all for ₦200 airtime. Doing the actual 10-minute walk is <em>easier</em>. That&apos;s the whole game.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-extrabold text-emerald-300">And reserve the big guns</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                High-value rewards add photo-hash dedup, witness-graph analysis, sensor cross-checks and human spot audits.
                Fraud rate target: &lt;3% of prize value — the industry bar for sustainable rewards.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/app" className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-white hover:bg-emerald-400">
              Open the app & test verification <ArrowRight size={16} />
            </Link>
            <Link href="/insights" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-black text-white hover:bg-white/10">
              Back to Deep Insight
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
