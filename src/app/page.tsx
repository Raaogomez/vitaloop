"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Footprints, Droplets, Moon, Flame, Smartphone, Zap, ShieldCheck,
  TrendingUp, Users, HeartPulse, ArrowRight, Play, Check, Star,
  Signal, Wallet, BellOff, Globe, Sparkles, Activity, ChevronDown,
} from "lucide-react";
import { OPERATORS } from "@/lib/data";

type Plan = { code: string; name: string; priceDisplay: string; tagline: string; features: string[]; popular: boolean; validityDays: number };

const EVERYDAY = [
  { icon: Footprints, title: "Walk the last bus stop", pts: "+120 pts", desc: "10 min brisk walk", color: "bg-emerald-500" },
  { icon: TrendingUp, title: "Take the stairs", pts: "+110 pts", desc: "5 floors, 5 min", color: "bg-teal-500" },
  { icon: Droplets, title: "Drink 4 glasses", pts: "+120 pts", desc: "Hydration streak", color: "bg-sky-500" },
  { icon: Moon, title: "Sleep 7.5 hrs", pts: "+135 pts", desc: "Recovery banked", color: "bg-indigo-500" },
];

const FAQS = [
  { q: "Do I need a bank card or smartphone to use VitalLoop?", a: "No. That's the whole point. You subscribe with your phone number and the fee is deducted from airtime via Direct Carrier Billing. The app works in any browser, and core nudges arrive by SMS/USSD so even feature-phone users stay in the loop." },
  { q: "How does carrier billing actually charge me?", a: "You enter your MSISDN, we detect your network (Header Enrichment on mobile data), you confirm with a PIN, and the operator's DCB gateway charges your airtime wallet. You get an SMS receipt with the price, validity and how to STOP. Renewals follow the same consented cycle." },
  { q: "What makes 'everyday activities' a health strategy?", a: "WHO's 150 min/week guideline can be met entirely through transport walking, chores, stair climbing and active work — no gym needed. VitalLoop converts those into a Vitality Score, streaks and rewards, which is proven to sustain behaviour 3–4× longer than generic fitness content." },
  { q: "How do I cancel?", a: "One tap in the app, SMS STOP to the shortcode, or dial the operator's VAS opt-out (*456*9# style). Cancellation is instant, you keep access till validity ends, and renewals stop immediately." },
  { q: "Is my health data shared with the telecom?", a: "Never. The operator only sees billing events (charge/refund/status). Your logs, scores and goals live in VitalLoop's database under consent-based controls. You can export or delete everything on request." },
  { q: "Why would a telecom want this?", a: "Wellness VAS reduces churn (sticky daily habit), grows ARPU via revenue share, and positions the operator as a digital-health partner. Our benchmarks show 2–3× lower refund rates than generic content portals because value is tangible daily." },
];

function VitalDemo() {
  const [checks, setChecks] = useState<boolean[]>([true, true, false, false]);
  const points = [120, 110, 120, 135];
  const total = checks.reduce((s, c, i) => s + (c ? points[i] : 0), 0);
  const pct = Math.min(100, Math.round((total / 485) * 100));
  const R = 54, C = 2 * Math.PI * R;
  return (
    <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:grid-cols-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Try it — tap your day</p>
        <h3 className="mt-1 text-xl font-extrabold text-white">Today, did you…</h3>
        <div className="mt-4 space-y-2.5">
          {EVERYDAY.map((e, i) => (
            <button
              key={e.title}
              onClick={() => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                checks[i] ? "border-emerald-400/60 bg-emerald-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl text-white ${e.color}`}>
                <e.icon size={20} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-white">{e.title}</span>
                <span className="block text-xs text-slate-400">{e.desc}</span>
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${checks[i] ? "bg-emerald-400 text-emerald-950" : "bg-white/10 text-slate-300"}`}>
                {e.pts}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl bg-black/30 p-6 text-center">
        <div className="relative h-44 w-44">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="12" />
            <circle cx="64" cy="64" r={R} fill="none" stroke="url(#vgrad)" strokeWidth="12" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} className="score-arc" />
            <defs>
              <linearGradient id="vgrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div>
              <p className="text-4xl font-black text-white">{total}</p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Vitality pts</p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm font-bold text-white">
          {total >= 400 ? "🔥 Athletic day — elite!" : total >= 200 ? "💪 Active day — keep going" : total > 0 ? "🌱 Waking up — add one more" : "😴 Dormant — tap an activity"}
        </p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
          No gym. No wearables. Just life, measured. This is the core loop subscribers pay for daily.
        </p>
        <Link href="/app" className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-400">
          Open the live app <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

export default function Landing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [seedMsg, setSeedMsg] = useState("");

  useEffect(() => {
    fetch("/api/seed", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setSeedMsg(`Catalog live: ${d.seeded.activities} activities • ${d.seeded.plans} plans • ${d.seeded.challenges} challenges`);
        return fetch("/api/plans");
      })
      .then((r) => r.json())
      .then((d) => d.ok && setPlans(d.plans))
      .catch(() => {});
  }, []);

  return (
    <main className="bg-[#071120]">
      {/* HERO */}
      <section className="vital-gradient overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-200">
              <Signal size={14} /> Live on MTN • Airtel • Glo • 9mobile • Safaricom
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
              Turn <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">everyday life</span> into everyday health.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              VitalLoop converts walking, chores, stairs, hydration and sleep into a <strong className="text-white">Vitality Score</strong>,
              streaks and airtime rewards — subscribed in <strong className="text-white">10 seconds with airtime</strong>. No bank card. No app store. No excuses.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/billing" className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-500/30 hover:bg-emerald-400">
                <Wallet size={18} /> Subscribe with Airtime
              </Link>
              <Link href="/app" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-black text-white hover:bg-white/10">
                <Play size={18} /> Try the Wellness App
              </Link>
            </div>
            <div className="mt-7 grid max-w-lg grid-cols-3 gap-3 text-center">
              {[["₦100", "starting price"], ["10 sec", "to subscribe"], ["0", "bank cards needed"]].map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xl font-black text-white">{v}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{l}</p>
                </div>
              ))}
            </div>
            {seedMsg && <p className="mt-4 text-xs font-semibold text-emerald-300/80">● {seedMsg}</p>}
          </div>
          <div>
            <VitalDemo />
          </div>
        </div>
        {/* operator marquee */}
        <div className="border-t border-white/10 bg-black/30 py-4">
          <div className="overflow-hidden">
            <div className="marquee px-4">
              {[...OPERATORS, ...OPERATORS].map((op, i) => (
                <span key={i} className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-slate-200">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: op.color }} />
                  {op.name} <span className="font-normal text-slate-400">• {op.country}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">How VitalLoop works</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Three steps. Zero friction. Built for the next billion subscribers.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { icon: Smartphone, step: "01", title: "Subscribe with your number", desc: "Enter MSISDN → network auto-detected → confirm PIN → airtime charged. Receipt by SMS with price, validity & STOP keyword. Works on any phone.", tag: "Direct Carrier Billing" },
              { icon: Activity, step: "02", title: "Live your normal life", desc: "Walk, climb stairs, sweep, dance, drink water, sleep. Log in 5 seconds or get auto-nudges by SMS/WhatsApp. Every bout earns Vitality Points.", tag: "Everyday activities" },
              { icon: Flame, step: "03", title: "Build streaks, win airtime", desc: "Streaks, squads & challenges keep you consistent. Hit goals to earn airtime cashback, bonus data and tele-consult discounts.", tag: "Rewards loop" },
            ].map((s) => (
              <div key={s.step} className="card-hover rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-emerald-300"><s.icon size={22} /></span>
                  <span className="text-4xl font-black text-slate-200">{s.step}</span>
                </div>
                <p className="mt-4 inline-block rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">{s.tag}</p>
                <h3 className="mt-2 text-lg font-extrabold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DCB EXPLAINER */}
      <section className="bg-slate-950 py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Why direct carrier billing</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Cards reach 5%. Airtime reaches 95%.
            </h2>
            <p className="mt-4 leading-relaxed text-slate-300">
              In Nigeria, Kenya, Ghana and most of Sub-Saharan Africa, fewer than 1 in 10 adults hold an active debit card for
              online payments — but 9 in 10 hold airtime. DCB turns every SIM into a wallet: micro-charges of ₦100–₦1,500
              deducted from prepaid balance with operator-grade consent.
            </p>
            <div className="mt-6 space-y-3">
              {[
                ["Frictionless checkout", "No OTP-from-bank, no app download, no card expiry. MSISDN + PIN = paid.", Zap],
                ["Micro-price friendly", "₦100 daily sachets match sachet-economy buying behaviour. ARPU compounds via renewal.", Wallet],
                ["Trust via telco brand", "Charges appear from a known shortcode with instant receipts and STOP control.", ShieldCheck],
                ["Works on USSD/SMS too", "Feature-phone users subscribe via *123# menus and get coaching by SMS.", BellOff],
              ].map(([t, d, Icon]) => (
                <div key={t as string} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(() => { const I = Icon as any; return <I size={20} className="mt-0.5 shrink-0 text-emerald-300" />; })()}
                  <div>
                    <p className="text-sm font-extrabold text-white">{t as string}</p>
                    <p className="text-sm text-slate-400">{d as string}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Simulated DCB consent flow</p>
            <div className="mt-4 space-y-0">
              {[
                ["1", "User taps 'Subscribe with Airtime'", "Landing page on mobile data"],
                ["2", "Header Enrichment detects MSISDN + operator", "No typing needed on-network"],
                ["3", "PIN sent by SMS → user confirms", "Double opt-in proof stored"],
                ["4", "DCB gateway charges airtime wallet", "₦100 – ₦1,500, capped daily"],
                ["5", "SMS receipt + service activated", "Price, validity, STOP keyword"],
                ["6", "Auto-renewal with pre-reminder", "Cancel anytime, 1 tap"],
              ].map(([n, t, s], i, arr) => (
                <div key={n} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < arr.length - 1 && <span className="absolute left-[15px] top-9 h-full w-0.5 bg-emerald-500/30" />}
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-sm font-black text-white">{n}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{t}</p>
                    <p className="text-xs text-slate-400">{s}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/billing" className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300">
              Experience the live billing demo <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-gradient-to-b from-slate-100 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Sachet pricing • airtime charged</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Priced like pure water. Valued like a coach.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {(plans.length ? plans : [
              { code: "x1", name: "Daily Flex", priceDisplay: "₦100/day", tagline: "Starter sachet", features: ["Vitality score", "SMS nudge", "1 challenge"], popular: false, validityDays: 1 },
              { code: "x2", name: "Weekly Plus", priceDisplay: "₦500/week", tagline: "Most popular", features: ["Everything + squads", "Coach summary", "50MB bonus"], popular: true, validityDays: 7 },
              { code: "x3", name: "Monthly Max", priceDisplay: "₦1,500/month", tagline: "Best value", features: ["Unlimited + tele-consult", "200MB bonus", "Health report"], popular: false, validityDays: 30 },
            ]).map((p) => (
              <div key={p.code} className={`card-hover relative rounded-3xl border p-6 ${p.popular ? "border-emerald-500 bg-slate-900 text-white shadow-2xl" : "border-slate-200 bg-white"}`}>
                {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-[11px] font-black uppercase tracking-wide text-white">Most popular</span>}
                <p className={`text-sm font-black uppercase tracking-wide ${p.popular ? "text-emerald-300" : "text-emerald-600"}`}>{p.name}</p>
                <p className={`mt-1 text-3xl font-black ${p.popular ? "text-white" : "text-slate-900"}`}>{p.priceDisplay}</p>
                <p className={`mt-2 text-sm ${p.popular ? "text-slate-300" : "text-slate-600"}`}>{p.tagline}</p>
                <ul className="mt-4 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${p.popular ? "text-slate-200" : "text-slate-700"}`}>
                      <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/billing" className={`mt-6 block rounded-2xl py-3 text-center text-sm font-black ${p.popular ? "bg-emerald-500 text-white hover:bg-emerald-400" : "bg-slate-900 text-white hover:bg-slate-700"}`}>
                  Subscribe with Airtime
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSIGHT TEASER */}
      <section className="bg-white pb-16 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-8 sm:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-amber-300">
                  <Sparkles size={14} /> Founder & investor briefing
                </p>
                <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">Is this idea actually good? We did the deep analysis.</h2>
                <p className="mt-3 leading-relaxed text-slate-300">
                  Market sizing, unit economics, DCB revenue splits, churn math, regulatory risks, GTM playbook and a
                  12-month roadmap — with interactive calculators. Read before you spend one naira.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                  {["8.4/10 viability", "₦2.1B revenue model", "34% service margin", "6-mo payback"].map((b) => (
                    <span key={b} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-slate-200">{b}</span>
                  ))}
                </div>
                <Link href="/insights" className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 hover:bg-amber-300">
                  Read the Deep Insight <ArrowRight size={16} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  [Users, "219M", "telco subs addressable (NG)"],
                  [HeartPulse, "68%", "adults inactive (WHO)"],
                  [Globe, "$480B", "global wellness app TAM"],
                  [Star, "4.8★", "projected store rating"],
                ].map(([Icon, v, l]) => (
                  <div key={l as string} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(() => { const I = Icon as any; return <I size={22} className="mx-auto text-emerald-300" />; })()}
                    <p className="mt-2 text-2xl font-black text-white">{v as string}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{l as string}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-black tracking-tight text-slate-900">Questions, answered honestly</h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
                  <span className="text-sm font-extrabold text-slate-900 sm:text-base">{f.q}</span>
                  <ChevronDown size={18} className={`shrink-0 text-slate-500 transition ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && <p className="border-t border-slate-100 p-5 text-sm leading-relaxed text-slate-600">{f.a}</p>}
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/app" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-black text-white hover:bg-slate-700">
              <HeartPulse size={18} /> Open Wellness App
            </Link>
            <Link href="/insights" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-900 hover:bg-slate-100">
              <TrendingUp size={18} /> Read Deep Insight
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
