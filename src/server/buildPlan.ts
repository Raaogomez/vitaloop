// ── Agent Mode build plan: phases → tasks (seeded into agent_tasks) ──
export type BuildTaskSeed = {
  phase: string; title: string; detail: string; sort: number;
};

export const BUILD_PHASES = [
  { id: "foundation", name: "Foundation", desc: "Backend core: config, errors, auth, validation, audit" },
  { id: "wellness", name: "Wellness Engine", desc: "Activities, logs, fraud screen, evidence, trust" },
  { id: "health-sync", name: "Health Connect Sync", desc: "Ingest, aggregate, auto-verify pipeline" },
  { id: "billing", name: "Carrier Billing", desc: "DCB subscribe, renew, STOP, webhooks, ledger" },
  { id: "mobile", name: "Mobile App", desc: "PWA + Expo shell, offline queue, devices, push" },
  { id: "ops", name: "Ops & Launch", desc: "Admin, jobs, docs, hardening, pilot" },
];

export const BUILD_TASKS: BuildTaskSeed[] = [
  { phase: "foundation", title: "Backend service layers + typed errors", detail: "src/server/* services with uniform {ok,data,error} envelopes, request IDs, structured logs.", sort: 1 },
  { phase: "foundation", title: "MSISDN session auth + admin/cron guards", detail: "HMAC session tokens (vl1.*), x-admin-key and x-cron-secret gates, webhook HMAC verify.", sort: 2 },
  { phase: "foundation", title: "Audit log + idempotency inbox", detail: "Every mutation writes audit_logs; mobile sync + webhooks are idempotent-safe.", sort: 3 },
  { phase: "wellness", title: "Wellness log pipeline with 8-check fraud screen", detail: "createLog() runs caps, velocity, spacing, impossible-day, time, bot, spike checks at write time.", sort: 10 },
  { phase: "wellness", title: "Evidence upgrades (★ verified / ◆ certified)", detail: "attachEvidence(): 1 method → verified, 2 distinct → certified +25%; trust +2/+4, flags cleared.", sort: 11 },
  { phase: "wellness", title: "Trust Score engine + challenge gating", detail: "0–100 trust; challenges progress on verifiedPoints only; low-trust caps.", sort: 12 },
  { phase: "health-sync", title: "Health Connect ingest + aggregation", detail: "10 record types, daily buckets, record explorer, READ-only scopes.", sort: 20 },
  { phase: "health-sync", title: "Sensor auto-verification matcher", detail: "±2h windows, ±30% tolerance per activity map; certified ◆ + evidence row + trust.", sort: 21 },
  { phase: "billing", title: "DCB subscribe + renewal + STOP flows", detail: "Simulator gateway with deterministic failures, cashback bonus, ledger entries.", sort: 30 },
  { phase: "billing", title: "Telco webhook receiver + settlement", detail: "/api/v1/webhooks/dcb with HMAC, idempotent inbox, subscription state machine.", sort: 31 },
  { phase: "mobile", title: "Mobile bootstrap endpoint (one-call start)", detail: "/api/v1/mobile/bootstrap returns profile+session+plans+activities+challenges+trust.", sort: 40 },
  { phase: "mobile", title: "Offline sync replay with clientIds", detail: "/api/v1/mobile/sync replays queued logs+sensor rows idempotently; device registry.", sort: 41 },
  { phase: "mobile", title: "PWA install + Expo shell docs", detail: "Manifest, installable /mobile prototype, Kotlin + Expo bridge snippets.", sort: 42 },
  { phase: "ops", title: "Admin overview + scheduled jobs", detail: "KPIs, timeseries, fraud mix; jobs: renewals, settlement, trust-recalc.", sort: 50 },
  { phase: "ops", title: "OpenAPI docs + architecture blueprint", detail: "/api/v1/openapi JSON, /architecture blueprint, /agent mission control.", sort: 51 },
  { phase: "ops", title: "Pilot readiness checklist", detail: "Seed, smoke tests, rate limits, disconnect/purge flows verified.", sort: 52 },
];
