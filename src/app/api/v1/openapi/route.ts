import { withApi } from "@/server/http";
import { config } from "@/server/config";

export const dynamic = "force-dynamic";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "VitalLoop Backend API",
    version: config.version,
    description:
      "Full backend for web + mobile: MSISDN identity, wellness logs with fraud screening, Health Connect sync + auto-verify, DCB billing + webhooks, challenges, devices, admin, jobs, agent.",
  },
  servers: [{ url: "/api", description: "Same-origin" }],
  tags: [
    { name: "system", description: "Health + status" },
    { name: "mobile", description: "Bootstrap + offline sync" },
    { name: "wellness", description: "Activities, logs, verification" },
    { name: "health-connect", description: "Sensor ingest + aggregate" },
    { name: "billing", description: "DCB subscribe/renew/STOP + webhooks" },
    { name: "admin", description: "Overview, jobs" },
    { name: "agent", description: "Build tasks + runs" },
  ],
  paths: {
    "/health": { get: { tags: ["system"], summary: "Liveness probe" } },
    "/v1/status": { get: { tags: ["system"], summary: "Backend status + table counts" } },
    "/v1/mobile/bootstrap": {
      post: {
        tags: ["mobile"],
        summary: "One-call mobile start",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { msisdn: { type: "string" }, displayName: { type: "string" } } } } } },
      },
    },
    "/v1/mobile/sync": {
      post: {
        tags: ["mobile"],
        summary: "Offline queue replay (logs + healthRecords), idempotent",
        parameters: [{ name: "x-idempotency-key", in: "header", schema: { type: "string" } }],
      },
    },
    "/v1/devices": {
      get: { tags: ["mobile"], summary: "List devices" },
      post: { tags: ["mobile"], summary: "Register/update device + push token" },
    },
    "/activities": { get: { tags: ["wellness"], summary: "Activity catalogue" } },
    "/logs": {
      get: { tags: ["wellness"], summary: "List logs (?subscriberId=)" },
      post: { tags: ["wellness"], summary: "Create log (fraud-screened)" },
    },
    "/verify": {
      get: { tags: ["wellness"], summary: "Evidence + trust (?subscriberId=)" },
      post: { tags: ["wellness"], summary: "Attach evidence → ★/◆" },
    },
    "/fraud": { get: { tags: ["wellness"], summary: "Fraud aggregates" } },
    "/health-connect": {
      get: { tags: ["health-connect"], summary: "status|records|aggregate|syncs" },
      post: { tags: ["health-connect"], summary: "connect|sync|demo-seed" },
    },
    "/plans": { get: { tags: ["billing"], summary: "DCB plans" } },
    "/subscriptions": {
      get: { tags: ["billing"], summary: "History (?msisdn=)" },
      post: { tags: ["billing"], summary: "Subscribe (charge attempt)" },
    },
    "/transactions": { get: { tags: ["billing"], summary: "Ledger (?msisdn=)" } },
    "/v1/webhooks/dcb": {
      get: { tags: ["billing"], summary: "Recent webhook events" },
      post: { tags: ["billing"], summary: "Telco callback receiver (HMAC, idempotent)" },
    },
    "/challenges": {
      get: { tags: ["wellness"], summary: "Challenge catalogue" },
      post: { tags: ["wellness"], summary: "Join challenge" },
    },
    "/v1/admin/overview": { get: { tags: ["admin"], summary: "KPIs + audit (x-admin-key)" } },
    "/v1/jobs": {
      get: { tags: ["admin"], summary: "List jobs" },
      post: { tags: ["admin"], summary: "Run job (?id=renewals)" },
    },
    "/agent/tasks": {
      get: { tags: ["agent"], summary: "List build tasks" },
      post: { tags: ["agent"], summary: "Seed/reset build plan" },
    },
    "/agent/run": { post: { tags: ["agent"], summary: "Execute agent action (seed/smoke/advance)" } },
  },
};

export const GET = withApi(async () => Response.json(spec), { scope: "openapi" });
