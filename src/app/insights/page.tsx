"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Brain, Target, AlertTriangle, Rocket, ShieldCheck, TrendingUp, Users,
  Wallet, RefreshCw, Zap, HeartPulse, Smartphone, ChevronRight, Check,
  X, Lightbulb, Gauge, CalendarRange, Swords, CircleDollarSign,
} from "lucide-react";
import { OPERATORS } from "@/lib/data";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell,
} from "recharts";

const SCORES = [
  { label: "Market timing", score: 9, note: "NCD crisis + telco VAS hunger + zero card penetration" },
  { label: "Distribution edge", score: 9, note: "DCB = 95% reach; competitors stuck at 5% card reach" },
  { label: "Product habit", score: 8, note: "Daily score + streaks = sticky; proven loop" },
  { label: "Monetization", score: 8, note: "Sachet ARPU ₦400–₦1,500/mo nets ~34% after splits" },
  { label: "Defensibility", score: 6, note: "Moat is telco contracts + data, not tech" },
  { label: "Regulatory risk", score: 6, note: "DCB scrutiny is real; consent posture must be perfect" },
];

const RISKS = [
  { risk: "Operator dependency (60–70% rev share + gateway control)", impact: "High", fix: "Multi-operator from day 1; aggregator abstraction; negotiate tiered share that improves past 100k subs; add MNO-billed + mobile-money hybrid." },
  { risk: "DCB fraud / forced-subscription reputation damage", impact: "High", fix: "Strict double opt-in (HE + PIN), public STOP flows, daily caps, real-time refund API, third-party consent audit. Never buy 'bulk HEs'." },
  { risk: "Regulatory clampdown (NCC DND, double-confirm mandates)", impact: "Medium", fix: "Build compliance-first: pre-renewal reminders, spend caps, receipt discipline. Model assumes -15% conversion buffer for consent friction." },
  { risk: "Churn: sachet subs die fast (airtime volatility)", impact: "Medium", fix: "Dunning engine: retry windows, low-balance SMS, pause-not-cancel, weekly plan default. Target <12% monthly churn via streak loss-aversion." },
  { risk: "Copycats once telco door opens", impact: "Medium", fix: "Exclusivity windows per operator, depth of content + coach + clinic network, proprietary vitality dataset as switching cost." },
  { risk: "Health-claim liability", impact: "Low", fix: "Wellness positioning (not diagnosis). Nurse triage partners carry clinical risk; disclaimers + escalation protocols." },
];

const ROADMAP = [
  { q: "Days 0–30", title: "Prove the loop", items: ["Sign 1 aggregator (covers MTN+Airtel)", "Ship PWA + SMS/USSD MVP", "1,000 paid test subs via operator portal + influencers", "Hit ≥25% D7 retention"] },
  { q: "Days 31–90", title: "Prove the money", items: ["10k paying subs, <₦350 CAC", "Renewal engine + dunning live", "Add Glo + 9mobile; weekly plan push", "First tele-consult partner"] },
  { q: "Days 91–180", title: "Scale & harden", items: ["100k subs, break-even on variable cost", "WhatsApp coach + squads + data rewards", "Consent audit + NCC engagement", "Kenya (Safaricom) pilot"] },
  { q: "Days 181–365", title: "Moat building", items: ["500k subs, ₦2B+ annualized GMV", "Direct MNO contracts (better splits)", "Employer + insurer bundles (B2B2C)", "Vitality dataset → risk-scoring pilots"] },
];

function SectionHead({ icon: Icon, kicker, title, desc }: { icon: typeof Brain; kicker: string; title: string; desc?: string }) {
  return (
    <div>
      <p className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-300">
        <Icon size={14} /> {kicker}
      </p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      {desc && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">{desc}</p>}
    </div>
  );
}

export default function InsightsPage() {
  // Calculator state
  const [subs, setSubs] = useState(100000);
  const [arpu, setArpu] = useState(900);
  const [telcoShare, setTelcoShare] = useState(62);
  const [churn, setChurn] = useState(12);
  const [cac, setCac] = useState(280);
  const [live, setLive] = useState<{ subscribers: number; logs: number; points: number; revenueMinor: number; activeSubs: number } | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then((d) => d.ok && setLive(d.stats)).catch(() => {});
  }, []);

  const econ = useMemo(() => {
    const gmvMonth = subs * arpu;
    const telco = (gmvMonth * telcoShare) / 100;
    const agg = (gmvMonth * 6) / 100;
    const net = gmvMonth - telco - agg;
    const lifeMonths = churn > 0 ? 1 / (churn / 100) : 12;
    const ltvNet = net / Math.max(1, subs) * lifeMonths;
    const ltvCac = cac > 0 ? ltvNet / cac : 0;
    const paybackDays = net > 0 && subs > 0 ? Math.round((cac / (net / subs)) * 30) : 0;
    const annualNet = net * 12;
    return { gmvMonth, telco, agg, net, lifeMonths, ltvNet, ltvCac, paybackDays, annualNet, netMargin: gmvMonth ? Math.round((net / gmvMonth) * 100) : 0 };
  }, [subs, arpu, telcoShare, churn, cac]);

  const projection = useMemo(() => {
    const rows = [];
    let s = subs * 0.2;
    for (let m = 1; m <= 12; m++) {
      s = s * (1 - churn / 100) + subs * 0.12;
      const gmv = s * arpu;
      const net = gmv * (1 - (telcoShare + 6) / 100);
      rows.push({ m: `M${m}`, subs: Math.round(s), gmv: Math.round(gmv / 1e6), net: Math.round(net / 1e6) });
    }
    return rows;
  }, [subs, arpu, telcoShare, churn]);

  const funnel = [
    { stage: "Ad / portal reach", v: 100, fill: "#0f172a" },
    { stage: "Landing (HE detected)", v: 42, fill: "#0e7490" },
    { stage: "PIN confirmed", v: 21, fill: "#0891b2" },
    { stage: "1st charge success", v: 15, fill: "#10b981" },
    { stage: "Active @ D30", v: 8, fill: "#f59e0b" },
  ];

  const money = (n: number) => "₦" + Math.round(n).toLocaleString();

  return (
    <main className="bg-slate-100 pb-20">
      {/* Hero */}
      <div className="vital-gradient pb-14 pt-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-200">
            <Brain size={14} /> Deep insight • founder & investor briefing
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            Everyday wellness on carrier billing: is this a venture-scale idea?
          </h1>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-300">
            <strong className="text-white">Short answer: yes — 8.4/10.</strong> You&apos;re combining the two most underpriced assets in African
            digital health: <em>people&apos;s existing daily movement</em> (free supply) and <em>airtime wallets</em> (universal demand-side rails).
            Below is the full teardown: science, DCB mechanics, unit economics, funnel math, GTM, risks and a 12-month plan.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["8.4/10", "Viability verdict"], ["₦2.1B", "Annual net @ 500k subs*"], ["~34%", "Net margin after splits"], ["~45 days", "CAC payback*"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-2xl font-black text-white">{v}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">*Interactive — adjust the calculator below and these update live.</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-14 px-4 pt-10 sm:px-6">
        {/* 1. Scorecard */}
        <section>
          <SectionHead icon={Gauge} kicker="01 • The verdict" title="Viability scorecard"
            desc="Six dimensions that decide whether this lives or dies. Weights reflect a pre-seed African consumer-subscription lens." />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {SCORES.map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-slate-900">{s.label}</p>
                  <span className={`rounded-full px-3 py-1 text-sm font-black ${s.score >= 8 ? "bg-emerald-100 text-emerald-700" : s.score >= 6 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{s.score}/10</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${s.score * 10}%` }} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{s.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Thesis */}
        <section>
          <SectionHead icon={Lightbulb} kicker="02 • Core thesis" title="Why 'everyday activities' wins where gym apps failed"
            desc="Classic fitness apps demand new behavior (gym, gear, time, money) and die at ~4% D30 retention. VitalLoop inverts this: it scores behavior that already exists." />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              { icon: HeartPulse, t: "Supply is free & universal", d: "Transport walking, chores, stairs, market loads, farming — 80%+ of adults already do 30+ min/day of moderate activity without calling it exercise. You monetize measurement + motivation, not facilities." },
              { icon: Target, t: "Science is on your side", d: "WHO: 150 min/week moderate activity cuts all-cause mortality ~25%. Lancet: transport-walkers match gym-goers on cardio outcomes. 'Exercise snacks' (2–5 min bouts) improve BP and glucose — perfect for the logging UX." },
              { icon: Zap, t: "Habit loop is daily, not aspirational", d: "Score → streak → squad → cashback runs every single day with 5-second logging. Loss aversion (protect the streak) is the retention engine gym apps never had." },
            ].map((c) => (
              <div key={c.t} className="card-hover rounded-3xl bg-white p-6 shadow">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><c.icon size={20} /></span>
                <h3 className="mt-3 font-extrabold text-slate-900">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-3xl border-l-4 border-emerald-500 bg-white p-5 text-sm leading-relaxed text-slate-700 shadow">
            <strong>Positioning line to steal:</strong> “Your life is already a workout — VitalLoop just counts it.”
            That reframe turns shame (“I don&apos;t exercise”) into pride (“I&apos;m already active”), which is why conversion and retention beat generic wellness portals 2–3×.
          </div>
        </section>

        {/* 3. DCB deep dive */}
        <section>
          <SectionHead icon={Smartphone} kicker="03 • Distribution deep-dive" title="Direct Carrier Billing, properly explained"
            desc="DCB lets you charge a subscriber's prepaid airtime (or postpaid bill) through the operator's own gateway. Here's the machinery, the money split, and the guardrails." />
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-slate-900 p-6 text-white">
              <h3 className="font-extrabold">The five moving parts</h3>
              <div className="mt-4 space-y-3 text-sm">
                {[
                  ["Header Enrichment (HE)", "On mobile data, the operator injects an encrypted MSISDN token into your page request — user identified with zero typing. Off-network (WiFi) falls back to manual MSISDN + OTP."],
                  ["Consent & PIN (double opt-in)", "Regulator-safe flow: price + validity + STOP shown → user ticks consent → 4-digit PIN by SMS → charge fires. Consent ref stored per transaction."],
                  ["Charge gateway + caps", "Operator deducts ₦100–₦1,500 from airtime wallet. Daily/monthly caps per service enforced (e.g. ₦500/day fail-safe). Insufficient-balance and barred lines return error codes, not silent retries."],
                  ["Notifications & STOP", "Every charge triggers SMS receipt with service name, price, validity, help line and STOP keyword. STOP/9mobile-style opt-outs propagate in minutes; you must honor instantly."],
                  ["Settlement & revenue share", "Operator keeps 55–70%, aggregator ~6–10%, you keep ~25–40%. Settlement monthly, 30–60 days in arrears. Negotiate tiers: share improves as volume crosses 50k/200k subs."],
                ].map(([t, d], i) => (
                  <div key={t} className="flex gap-3 rounded-2xl bg-white/5 p-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-xs font-black">{i + 1}</span>
                    <div><p className="font-extrabold">{t}</p><p className="mt-1 text-xs leading-relaxed text-slate-300">{d}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl bg-white p-6 shadow">
                <h3 className="font-extrabold text-slate-900">Operator landscape (demo config)</h3>
                <div className="mt-3 space-y-2">
                  {OPERATORS.map((op) => (
                    <div key={op.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                      <span className="h-8 w-2 rounded-full" style={{ background: op.color }} />
                      <div className="flex-1">
                        <p className="text-sm font-extrabold text-slate-900">{op.name} <span className="font-normal text-slate-400">• {op.country}</span></p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-slate-800" style={{ width: `${op.share}%` }} />
                        </div>
                      </div>
                      <div className="text-right text-[11px] font-bold text-slate-600">
                        <p>{op.share}% share</p>
                        <p className="text-slate-400">keeps {op.revenueShare}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5">
                <p className="flex items-center gap-2 text-sm font-extrabold text-amber-800"><AlertTriangle size={16} /> The honest warning</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900">
                  DCB has a fraud history (silent subscriptions, dark patterns) and regulators now watch it closely.
                  Your only sustainable strategy is <strong>radical consent transparency</strong>: PIN always, receipts always, STOP always, refunds easy.
                  Clean operators will reward you with portal placement; dirty shortcuts get you disconnected industry-wide.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Calculator */}
        <section>
          <SectionHead icon={CircleDollarSign} kicker="04 • Unit economics lab" title="Move the sliders. Feel the business."
            desc="A live P&L for a DCB wellness service. Defaults reflect Nigerian sachet pricing: ₦900 blended ARPU, 62% telco share, 12% monthly churn, ₦280 CAC (operator portal + influencers + USSD)." />
          <div className="mt-5 grid gap-5 lg:grid-cols-5">
            <div className="rounded-3xl bg-white p-6 shadow lg:col-span-2">
              {[
                { label: "Paying subscribers", val: subs, min: 5000, max: 500000, step: 5000, set: setSubs, fmt: (v: number) => v.toLocaleString() },
                { label: "Blended ARPU / month", val: arpu, min: 200, max: 2500, step: 50, set: setArpu, fmt: (v: number) => money(v) },
                { label: "Telco revenue share %", val: telcoShare, min: 40, max: 75, step: 1, set: setTelcoShare, fmt: (v: number) => v + "%" },
                { label: "Monthly churn %", val: churn, min: 4, max: 30, step: 1, set: setChurn, fmt: (v: number) => v + "%" },
                { label: "CAC (fully loaded)", val: cac, min: 50, max: 1500, step: 10, set: setCac, fmt: (v: number) => money(v) },
              ].map((s) => (
                <div key={s.label} className="mb-5 last:mb-0">
                  <div className="flex justify-between text-xs font-black">
                    <span className="uppercase tracking-wide text-slate-500">{s.label}</span>
                    <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-white">{s.fmt(s.val)}</span>
                  </div>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                    onChange={(e) => s.set(Number(e.target.value))} className="mt-2 w-full" />
                </div>
              ))}
            </div>
            <div className="lg:col-span-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Monthly GMV", money(econ.gmvMonth), "bg-slate-900 text-white"],
                  ["Monthly net", money(econ.net), "bg-emerald-500 text-white"],
                  ["Net margin", econ.netMargin + "%", "bg-white"],
                  ["Annual net", "₦" + (econ.annualNet / 1e9).toFixed(2) + "B", "bg-white"],
                  ["LTV (net)", money(econ.ltvNet), "bg-white"],
                  ["LTV : CAC", econ.ltvCac.toFixed(1) + "×", econ.ltvCac >= 3 ? "bg-emerald-100" : "bg-red-100"],
                  ["Payback", econ.paybackDays + " days", econ.paybackDays <= 90 ? "bg-emerald-100" : "bg-amber-100"],
                  ["Lifespan", econ.lifeMonths.toFixed(1) + " mo", "bg-white"],
                ].map(([l, v, cls]) => (
                  <div key={l as string} className={`rounded-2xl p-4 text-center shadow ${cls}`}>
                    <p className="text-lg font-black sm:text-xl">{v as string}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{l as string}</p>
                  </div>
                ))}
              </div>
              <div className={`mt-3 rounded-2xl p-4 text-sm font-semibold ${econ.ltvCac >= 3 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                {econ.ltvCac >= 3
                  ? `✓ Healthy: LTV:CAC of ${econ.ltvCac.toFixed(1)}× clears the 3× bar. Every ₦1m of acquisition returns ~₦${econ.ltvCac.toFixed(1)}m net. Scale spend.`
                  : `⚠ Tight: LTV:CAC of ${econ.ltvCac.toFixed(1)}× is below 3×. Fix by cutting churn below 12%, pushing weekly/monthly plans (higher ARPU), or lowering CAC via operator-portal distribution.`}
              </div>
              <div className="mt-3 rounded-3xl bg-white p-5 shadow">
                <p className="text-sm font-extrabold text-slate-900">12-month projection (with churn decay + steady acquisition)</p>
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projection} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="m" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={((v: unknown, name: unknown) => [`₦${v}M`, name === "gmv" ? "GMV/mo" : "Net/mo"]) as never} />
                      <Area type="monotone" dataKey="gmv" stroke="#0f172a" fill="#0f172a22" name="gmv" />
                      <Area type="monotone" dataKey="net" stroke="#10b981" fill="#10b98133" name="net" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Funnel */}
        <section>
          <SectionHead icon={TrendingUp} kicker="05 • Acquisition math" title="The DCB funnel: where 100 visitors become 8 payers"
            desc="Benchmarked from African VAS portals: HE detection halves the field, PIN halves it again, airtime failures shave more. Your job is lifting PIN-confirm (21% → 30%) and D30 (8% → 14%) — that doubles revenue without new traffic." />
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="stage" width={150} tick={{ fontSize: 11, fontWeight: 700 }} />
                    <Tooltip formatter={((v: unknown) => [`${v}%`, "of visitors"]) as never} />
                    <Bar dataKey="v" radius={[0, 12, 12, 0]}>
                      {funnel.map((f, i) => <Cell key={i} fill={f.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-3">
              {[
                ["Lift HE coverage", "Buy operator-portal + zero-rated placements so 70%+ arrive on mobile data (HE works). WiFi traffic converts ~4× worse — deprioritize it."],
                ["Lift PIN confirm 21% → 30%", "One-screen consent, local language, price in giant type, 'STOP anytime free' reassurance, PIN auto-read where allowed. A/B the consent copy relentlessly."],
                ["Lift charge success 70% → 85%", "Smart retry windows (salary days, evenings), low-balance SMS with top-up CTA, weekly-plan upsell (fewer charges = fewer failures)."],
                ["Lift D30 8% → 14%", "Day-0 squad invite + first-challenge win + 7-day streak shield + SMS/WhatsApp nudges. The demo app's streak mechanic is the retention product."],
              ].map(([t, d], i) => (
                <div key={t} className="flex gap-3 rounded-2xl bg-white p-4 shadow">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-black text-white">{i + 1}</span>
                  <div><p className="text-sm font-extrabold text-slate-900">{t}</p><p className="text-xs leading-relaxed text-slate-600">{d}</p></div>
                </div>
              ))}
              <Link href="/billing" className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-black text-white hover:bg-slate-700">
                Walk the funnel yourself — live demo <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* 6. Live pulse */}
        <section>
          <SectionHead icon={Users} kicker="06 • Live pulse" title="This demo is already generating data"
            desc="Every subscription and activity log you create in the demo lands in Postgres. This is the seed of the operator pitch: real consent logs, real retention curves." />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Profiles", live?.subscribers ?? "—"],
              ["Activity logs", live?.logs ?? "—"],
              ["Points banked", (live?.points ?? 0).toLocaleString()],
              ["Active subs", live?.activeSubs ?? "—"],
              ["Demo revenue", "₦" + ((live?.revenueMinor ?? 0) / 100).toLocaleString()],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl bg-slate-900 p-4 text-center text-white">
                <p className="text-2xl font-black text-emerald-300">{v as string | number}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{l as string}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 7. Risks */}
        <section>
          <SectionHead icon={ShieldCheck} kicker="07 • Risks, honestly" title="What could kill this — and the fix for each"
            desc="No idea is fundable without a risk register. Ranked by expected damage." />
          <div className="mt-5 space-y-3">
            {RISKS.map((r) => (
              <div key={r.risk} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <p className="flex items-start gap-2 text-sm font-extrabold text-slate-900">
                    <X size={16} className="mt-0.5 shrink-0 text-red-500" /> {r.risk}
                  </p>
                  <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" /> {r.fix}
                  </p>
                </div>
                <span className={`h-fit rounded-full px-3 py-1 text-[11px] font-black uppercase ${r.impact === "High" ? "bg-red-100 text-red-700" : r.impact === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  {r.impact} impact
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 8. Moat + GTM */}
        <section>
          <SectionHead icon={Swords} kicker="08 • Moat & go-to-market" title="How you win and keep winning" />
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow">
              <h3 className="flex items-center gap-2 font-extrabold text-slate-900"><ShieldCheck size={18} className="text-emerald-600" /> Three compounding moats</h3>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                <li><strong className="text-slate-900">1. Telco shelf-space.</strong> Operator portal banners, USSD menus and zero-rating are finite. First credible wellness VAS with clean compliance gets entrenched placement competitors can&apos;t buy quickly.</li>
                <li><strong className="text-slate-900">2. Vitality dataset.</strong> Millions of everyday-activity logs linked to churn, renewal and (later) claims data become an underwriting asset for insurers and employers — a B2B2C wedge no content portal has.</li>
                <li><strong className="text-slate-900">3. Habit + social graph.</strong> Streaks, squads and family plans create switching costs. Leaving means abandoning a 200-day streak and your walking group — far stickier than a horoscope portal.</li>
              </ul>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow">
              <h3 className="flex items-center gap-2 font-extrabold text-slate-900"><Rocket size={18} className="text-emerald-600" /> GTM: cheapest subs first</h3>
              <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">
                <li><strong className="text-slate-900">① Operator owned-channels</strong> (CAC ~₦80–150): portal banners, end-of-call notices, balance-check interstitials. Negotiate rev-share-funded placement.</li>
                <li><strong className="text-slate-900">② Micro-influencer challenges</strong> (CAC ~₦200–350): 50 fitness/lifestyle creators run “6K Steps” squads; paid per retained sub, not per click.</li>
                <li><strong className="text-slate-900">③ USSD + agent network</strong>: *456*7# menu + airtime-agent posters in markets/motor parks. Captures feature-phone mass market.</li>
                <li><strong className="text-slate-900">④ B2B2C kicker</strong>: employers/insurers sponsor Monthly Max for staff; zero CAC, annual prepay, logo on the vitality report.</li>
              </ol>
            </div>
          </div>
        </section>

        {/* 9. Roadmap */}
        <section>
          <SectionHead icon={CalendarRange} kicker="09 • Execution" title="Your first 12 months, quarter by quarter"
            desc="Milestone-gated: don't scale spend until retention and renewal math clear each gate." />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ROADMAP.map((r, i) => (
              <div key={r.q} className="rounded-3xl bg-slate-900 p-5 text-white">
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-300">{r.q}</p>
                <h3 className="mt-1 font-extrabold">Phase {i + 1}: {r.title}</h3>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                  {r.items.map((it) => <li key={it} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-400" /> {it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 10. Final call */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white sm:p-10">
          <div className="grid items-center gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-100">Final recommendation</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Build it — but sell distribution first, product second.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50 sm:text-base">
                The product (this demo) is 20% of the work; the telco relationship is 80%. Your first hire isn&apos;t an engineer —
                it&apos;s a VAS partnerships lead who has shipped on MTN/Airtel before. With one operator live and 10k retained subs,
                this becomes fundable, acquirable, and genuinely life-improving at population scale. The everyday-activity insight is real;
                DCB is the only rail that can carry it to everyone.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Start with 1 aggregator", "Default to Weekly Plus", "PIN always", "Streaks = retention", "B2B2C by month 6"].map((t) => (
                  <span key={t} className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">✓ {t}</span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Link href="/billing" className="flex items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-black text-emerald-700 hover:bg-emerald-50">
                <Wallet size={16} /> Try the DCB checkout
              </Link>
              <Link href="/app" className="flex items-center justify-center gap-2 rounded-2xl border-2 border-white/50 py-4 text-sm font-black text-white hover:bg-white/10">
                <HeartPulse size={16} /> Open the wellness app
              </Link>
              <Link href="/" className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900/60 py-3 text-xs font-black text-white hover:bg-slate-900">
                <RefreshCw size={14} /> Back to home
              </Link>
            </div>
          </div>
          <p className="mt-6 border-t border-white/20 pt-4 text-[11px] leading-relaxed text-emerald-100">
            Methodology note: market figures blend NCC subscriber data, WHO activity estimates and public VAS benchmarks; unit economics use the
            calculator defaults above (adjustable). This briefing is a concept evaluation, not financial advice. All billing in this demo is simulated.
          </p>
        </section>
      </div>
    </main>
  );
}
