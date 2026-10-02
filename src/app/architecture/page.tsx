"use client";

import Link from "next/link";
import {
  Layers, Server, Smartphone, Database, HeartPulse, CreditCard, ShieldCheck,
  ArrowRight, Boxes, GitBranch, Lock, RefreshCw, Bell, FileJson, Zap,
} from "lucide-react";

const LAYERS = [
  {
    name: "Clients",
    color: "#10b981",
    items: ["Next.js Web (PWA, installable)", "Expo Android shell + Health Connect bridge", "Capacitor wrap (alt)", "USSD / SMS fallback (feature phones)", "Operator portals (HE traffic)"],
  },
  {
    name: "Edge / API Gateway (Next.js Route Handlers)",
    color: "#0ea5e9",
    items: ["withApi(): request-ID, logging, rate-limit", "Zod validation on every write", "MSISDN sessions (vl1.* HMAC) + admin/cron guards", "Uniform envelope { ok, data | error{ code,message } }", "OpenAPI 3.0 spec at /api/v1/openapi"],
  },
  {
    name: "Domain Services (src/server/services)",
    color: "#8b5cf6",
    items: ["billing.ts — subscribe/renew/STOP/ledger", "wellness.ts — logs + 8-check fraud screen", "verification.ts — evidence ★/◆ + trust", "health.ts — HC ingest/aggregate/auto-verify", "challenges.ts — join/progress/settle", "admin.ts — KPIs/timeseries"],
  },
  {
    name: "Platform Services",
    color: "#f59e0b",
    items: ["Audit log (every mutation traced)", "Idempotency inbox (mobile sync + webhooks)", "Jobs: renewals, settlement, trust-recalc, dunning", "Webhook receiver (HMAC, telco callbacks)", "Devices registry + push tokens"],
  },
  {
    name: "Data (PostgreSQL + Drizzle)",
    color: "#ec4899",
    items: ["18 tables: subscribers → logs → evidence → health → billing → devices → audit → agent", "Fraud + verification columns on every log", "Challenge progress on verifiedPoints only", " drizzle-kit push migrations"],
  },
];

const FLOWS = [
  { t: "Mobile cold start", d: "POST /api/v1/mobile/bootstrap {msisdn} → subscriber + session token + plans + activities + challenges + trust + subscription in ONE round-trip. Device registered.", icon: Smartphone },
  { t: "Offline log → sync", d: "App queues {clientId, activityKey, qty, evidence} in AsyncStorage → POST /api/v1/mobile/sync replays idempotently → fraud screen per log → {accepted|flagged} per clientId.", icon: RefreshCw },
  { t: "Sensor verify loop", d: "Android reads Health Connect on-device → sync pushes windows → server matches ±2h/±30% → certified ◆ +25%, trust +4, sensor evidence row.", icon: HeartPulse },
  { t: "DCB money loop", d: "Subscribe → simulator/aggregator charge → ledger + cashback → renewals job → telco webhooks (charge.confirmed / stopped / refund) update state machine.", icon: CreditCard },
];

const APIS = [
  ["GET /api/health", "Liveness + version + db latency"],
  ["GET /api/v1/status", "Backend status + table counts + services"],
  ["POST /api/v1/mobile/bootstrap", "One-call mobile start + session"],
  ["POST /api/v1/mobile/sync", "Offline replay (x-idempotency-key)"],
  ["GET/POST /api/v1/devices", "Device + push-token registry"],
  ["GET/POST /api/logs", "Fraud-screened wellness logs"],
  ["GET/POST /api/verify", "Evidence ★/◆ + trust summary"],
  ["GET/POST /api/health-connect", "HC connect/sync/aggregate/demo"],
  ["GET/POST/PATCH /api/subscriptions", "DCB lifecycle"],
  ["POST /api/v1/webhooks/dcb", "Telco callbacks (HMAC, idempotent)"],
  ["GET/POST /api/v1/jobs", "renewals, settlement, trust, dunning"],
  ["GET /api/v1/admin/overview", "KPIs + audit (x-admin-key)"],
  ["GET /api/agent/tasks", "Build plan board state"],
  ["POST /api/agent/run", "smoke | seed-demo | advance | renewals | settle"],
  ["GET /api/v1/openapi", "OpenAPI 3.0 JSON"],
];

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <div className="vital-gradient pb-12 pt-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-violet-200">
            <Layers size={14} /> Full backend architecture • v2.0-agent
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl">
            One backend. Web + mobile + telco.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            This is the production-shaped backend you asked for: layered services, typed errors, session auth,
            idempotent mobile sync, telco webhooks, scheduled jobs, audit trail and a live build plan.
            Everything below is <strong className="text-white">implemented and running</strong> — not a diagram of wishes.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/agent" className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-white hover:bg-emerald-400">
              Open Agent Mode <ArrowRight size={16} />
            </Link>
            <a href="/api/v1/openapi" target="_blank" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-black text-white hover:bg-white/10">
              <FileJson size={16} /> OpenAPI JSON
            </a>
            <a href="/api/v1/status" target="_blank" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-black text-white hover:bg-white/10">
              <Server size={16} /> Live status
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-12 px-4 pt-8 sm:px-6">
        <section>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><Boxes size={20} className="text-violet-600" /> The 5 layers</h2>
          <div className="mt-4 space-y-3">
            {LAYERS.map((l, i) => (
              <div key={l.name} className="overflow-hidden rounded-3xl bg-white shadow">
                <div className="flex items-center gap-3 px-5 py-3" style={{ background: `${l.color}18` }}>
                  <span className="grid h-8 w-8 place-items-center rounded-full text-sm font-black text-white" style={{ background: l.color }}>{i + 1}</span>
                  <p className="font-extrabold text-slate-900">{l.name}</p>
                </div>
                <div className="flex flex-wrap gap-2 px-5 py-4">
                  {l.items.map((it) => (
                    <span key={it} className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700">{it}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><GitBranch size={20} className="text-emerald-600" /> The 4 critical flows</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {FLOWS.map((f) => (
              <div key={f.t} className="rounded-3xl bg-slate-900 p-5 text-white">
                <p className="flex items-center gap-2 font-extrabold"><f.icon size={18} className="text-emerald-300" /> {f.t}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow">
            <h3 className="flex items-center gap-2 font-extrabold text-slate-900"><Database size={18} className="text-pink-500" /> Data model (18 tables)</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
              {[
                ["subscribers", "MSISDN identity + trust"],
                ["devices", "push tokens, builds"],
                ["wellness_activities", "14-activity catalog"],
                ["wellness_logs", "levels + flags"],
                ["verification_evidence", "proof rows"],
                ["fraud_events", "screen audit"],
                ["health_connections", "HC links"],
                ["health_records", "sensor windows"],
                ["health_syncs", "sync history"],
                ["dcb_plans", "sachet plans"],
                ["dcb_subscriptions", "lifecycle"],
                ["dcb_transactions", "ledger"],
                ["challenges", "templates"],
                ["challenge_enrollments", "verified progress"],
                ["audit_logs", "who-did-what"],
                ["webhook_events", "telco inbox"],
                ["idempotency_keys", "sync replay"],
                ["agent_tasks+runs", "build plan"],
              ].map(([t, d]) => (
                <div key={t} className="rounded-xl bg-slate-50 p-2.5">
                  <p className="font-black text-slate-900">{t}</p>
                  <p className="font-sans text-[10px] text-slate-500">{d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-6 shadow">
              <h3 className="flex items-center gap-2 font-extrabold text-slate-900"><Zap size={18} className="text-amber-500" /> API surface</h3>
              <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
                {APIS.map(([p, d]) => (
                  <div key={p} className="rounded-xl border border-slate-100 p-2.5">
                    <p className="font-mono text-[11px] font-black text-slate-900">{p}</p>
                    <p className="text-[11px] text-slate-500">{d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-900 p-6 text-white">
              <h3 className="flex items-center gap-2 font-extrabold"><Lock size={18} className="text-emerald-300" /> Security posture</h3>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                <li>• <strong className="text-white">MSISDN sessions:</strong> HMAC-signed <span className="font-mono">vl1.*</span> tokens, 30-day TTL, verified on sync.</li>
                <li>• <strong className="text-white">Admin/cron gates:</strong> <span className="font-mono">x-admin-key</span> + <span className="font-mono">x-cron-secret</span> headers.</li>
                <li>• <strong className="text-white">Webhooks:</strong> HMAC-SHA256 + providerRef dedup inbox.</li>
                <li>• <strong className="text-white">Validation:</strong> Zod on every mutation; typed error codes.</li>
                <li>• <strong className="text-white">Rate limits:</strong> 120/min/IP on sync; audit on all mutations.</li>
              </ul>
              <h3 className="mt-4 flex items-center gap-2 font-extrabold"><Bell size={18} className="text-amber-300" /> Jobs (cron)</h3>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-300">
                renewals (15min) • challenge-settlement (hourly) • trust-recalc (daily) • dunning (6h)<br />
                Run: POST /api/v1/jobs?id=renewals + x-cron-secret
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            ["ShieldCheck", "Fraud-safe rewards", "Challenges settle on verifiedPoints only. Self-logs never pay."],
            ["HeartPulse", "Sensor-verified truth", "Health Connect windows auto-certify ◆ matching logs."],
            ["CreditCard", "Telco-grade money", "Ledger + webhooks + STOP + refunds. Simulator → live by config."],
          ].map(([icon, t, d]) => {
            const I = icon === "ShieldCheck" ? ShieldCheck : icon === "HeartPulse" ? HeartPulse : CreditCard;
            return (
              <div key={t} className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-5">
                <I size={20} className="text-emerald-700" />
                <p className="mt-2 text-sm font-extrabold text-slate-900">{t}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{d}</p>
              </div>
            );
          })}
        </section>

        <div className="flex flex-wrap gap-2">
          <Link href="/agent" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-black text-white">Enter Agent Mode <ArrowRight size={15} /></Link>
          <Link href="/developer" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-800 shadow">Browse source</Link>
          <Link href="/mobile" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-800 shadow">Mobile prototype</Link>
        </div>
      </div>
    </main>
  );
}
