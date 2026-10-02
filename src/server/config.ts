// ── VitalLoop backend config: single source of truth ──
export const APP_VERSION = "2.0.0-agent";
export const API_VERSION = "v1";

export const config = {
  version: APP_VERSION,
  apiVersion: API_VERSION,
  env: process.env.NODE_ENV || "development",
  cronSecret: process.env.CRON_SECRET || "dev-cron-secret",
  adminKey: process.env.ADMIN_KEY || "dev-admin-key",
  dcb: {
    mode: process.env.DCB_MODE || "simulator", // simulator | sandbox | live
    defaultCurrency: "NGN",
    dailyCapMinor: 50000,
    aggregatorPct: 6,
  },
  verification: {
    autoVerifyWindowHours: 2,
    tolerancePct: 30,
    certifiedBonusPct: 25,
    trustStart: 50,
  },
  mobile: {
    minSupportedBuild: 12,
    syncBatchMax: 200,
    offlineQueueMax: 500,
  },
  rateLimit: {
    windowMs: 60_000,
    maxPerWindow: 120,
  },
} as const;

export type AppConfig = typeof config;
