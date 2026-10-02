import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  varchar,
  real,
} from "drizzle-orm/pg-core";

// ── Subscribers (telco users identified by MSISDN) ──
export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  msisdn: varchar("msisdn", { length: 32 }).notNull().unique(),
  operator: varchar("operator", { length: 64 }).notNull().default("MTN"),
  country: varchar("country", { length: 64 }).notNull().default("Nigeria"),
  countryCode: varchar("country_code", { length: 8 }).notNull().default("+234"),
  displayName: varchar("display_name", { length: 120 }),
  ageBand: varchar("age_band", { length: 16 }),
  gender: varchar("gender", { length: 16 }),
  goals: jsonb("goals").$type<string[]>().default([]),
  dailyStepGoal: integer("daily_step_goal").notNull().default(6000),
  waterGoalLiters: real("water_goal_liters").notNull().default(2.5),
  trustScore: integer("trust_score").notNull().default(50),
  verifiedLogs: integer("verified_logs").notNull().default(0),
  flaggedLogs: integer("flagged_logs").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Verification evidence attached to logs ──
export const verificationEvidence = pgTable("verification_evidence", {
  id: serial("id").primaryKey(),
  logId: integer("log_id").notNull(),
  subscriberId: integer("subscriber_id").notNull(),
  method: varchar("method", { length: 32 }).notNull(),
  detail: text("detail").notNull(),
  witnessMsisdn: varchar("witness_msisdn", { length: 32 }),
  status: varchar("status", { length: 16 }).notNull().default("accepted"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Fraud screening audit trail ──
export const fraudEvents = pgTable("fraud_events", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull(),
  logId: integer("log_id"),
  codes: jsonb("codes").$type<string[]>().default([]),
  detail: text("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Everyday wellness activity catalogue ──
export const wellnessActivities = pgTable("wellness_activities", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 120 }).notNull(),
  category: varchar("category", { length: 48 }).notNull(),
  description: text("description").notNull(),
  pointsPerUnit: integer("points_per_unit").notNull().default(10),
  unit: varchar("unit", { length: 24 }).notNull().default("min"),
  caloriesPerUnit: real("calories_per_unit").notNull().default(4),
  icon: varchar("icon", { length: 32 }).notNull().default("activity"),
  everyday: boolean("everyday").notNull().default(true),
});

// ── Logged activity (with verification & anti-fraud) ──
export const wellnessLogs = pgTable("wellness_logs", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull(),
  activityId: integer("activity_id").notNull(),
  quantity: real("quantity").notNull().default(1),
  steps: integer("steps").notNull().default(0),
  pointsEarned: integer("points_earned").notNull().default(0),
  calories: real("calories").notNull().default(0),
  mood: varchar("mood", { length: 16 }),
  note: text("note"),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
  verificationLevel: varchar("verification_level", { length: 16 }).notNull().default("self"),
  verificationMethod: varchar("verification_method", { length: 32 }).notNull().default("self"),
  verifiedPoints: integer("verified_points").notNull().default(0),
  flagged: boolean("flagged").notNull().default(false),
  flagCodes: jsonb("flag_codes").$type<string[]>().default([]),
  flagReason: text("flag_reason"),
  evidenceCount: integer("evidence_count").notNull().default(0),
});

// ── DCB subscription plans ──
export const dcbPlans = pgTable("dcb_plans", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  priceMinor: integer("price_minor").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("NGN"),
  priceDisplay: varchar("price_display", { length: 32 }).notNull(),
  validityDays: integer("validity_days").notNull().default(1),
  operator: varchar("operator", { length: 64 }).notNull().default("ALL"),
  tagline: text("tagline").notNull(),
  features: jsonb("features").$type<string[]>().default([]),
  popular: boolean("popular").notNull().default(false),
  airtimeCashbackPct: integer("airtime_cashback_pct").notNull().default(0),
});

// ── DCB subscriptions ──
export const dcbSubscriptions = pgTable("dcb_subscriptions", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull(),
  planId: integer("plan_id").notNull(),
  msisdn: varchar("msisdn", { length: 32 }).notNull(),
  operator: varchar("operator", { length: 64 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  consentRef: varchar("consent_ref", { length: 64 }),
  heVerified: boolean("he_verified").notNull().default(false),
  pinVerified: boolean("pin_verified").notNull().default(false),
  transactionId: varchar("transaction_id", { length: 64 }),
  renewals: integer("renewals").notNull().default(0),
  nextBillingAt: timestamp("next_billing_at"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

// ── DCB transactions ledger ──
export const dcbTransactions = pgTable("dcb_transactions", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id"),
  msisdn: varchar("msisdn", { length: 32 }).notNull(),
  operator: varchar("operator", { length: 64 }).notNull(),
  type: varchar("type", { length: 24 }).notNull().default("charge"),
  amountMinor: integer("amount_minor").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("NGN"),
  status: varchar("status", { length: 24 }).notNull().default("success"),
  providerRef: varchar("provider_ref", { length: 80 }),
  errorCode: varchar("error_code", { length: 32 }),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Challenges ──
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 140 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 48 }).notNull().default("steps"),
  targetPoints: integer("target_points").notNull().default(500),
  durationDays: integer("duration_days").notNull().default(7),
  reward: varchar("reward", { length: 140 }).notNull(),
  icon: varchar("icon", { length: 32 }).notNull().default("trophy"),
  participants: integer("participants").notNull().default(1200),
});

// ── Challenge enrollments (verified-points based) ──
export const challengeEnrollments = pgTable("challenge_enrollments", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull(),
  subscriberId: integer("subscriber_id").notNull(),
  progress: integer("progress").notNull().default(0),
  verifiedProgress: integer("verified_progress").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  completed: boolean("completed").notNull().default(false),
});

// ── Health tips library ──
export const healthTips = pgTable("health_tips", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 48 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  readMins: integer("read_mins").notNull().default(2),
});

// ── Health Connect / sensor connections (one per subscriber+device) ──
export const healthConnections = pgTable("health_connections", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull(),
  provider: varchar("provider", { length: 32 }).notNull().default("health_connect"),
  deviceName: varchar("device_name", { length: 120 }).notNull().default("Android device"),
  deviceId: varchar("device_id", { length: 80 }),
  status: varchar("status", { length: 16 }).notNull().default("connected"),
  scopes: jsonb("scopes").$type<string[]>().default([]),
  lastSyncAt: timestamp("last_sync_at"),
  totalRecords: integer("total_records").notNull().default(0),
  autoVerify: boolean("auto_verify").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Aggregated Health Connect records (steps, sleep, exercise, HR…) ──
export const healthRecords = pgTable("health_records", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull(),
  connectionId: integer("connection_id"),
  recordType: varchar("record_type", { length: 48 }).notNull(),
  value: real("value").notNull(),
  unit: varchar("unit", { length: 24 }).notNull().default("count"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  sourceApp: varchar("source_app", { length: 120 }).notNull().default("Health Connect"),
  needsVerification: boolean("needs_verification").notNull().default(false),
  matchedLogId: integer("matched_log_id"),
  raw: jsonb("raw").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Sync run history ──
export const healthSyncs = pgTable("health_syncs", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull(),
  connectionId: integer("connection_id"),
  recordsReceived: integer("records_received").notNull().default(0),
  recordsStored: integer("records_stored").notNull().default(0),
  logsAutoVerified: integer("logs_auto_verified").notNull().default(0),
  logsFlagged: integer("logs_flagged").notNull().default(0),
  summary: jsonb("summary").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Mobile devices + push tokens ──
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id"),
  deviceId: varchar("device_id", { length: 80 }).notNull(),
  platform: varchar("platform", { length: 16 }).notNull().default("android"),
  model: varchar("model", { length: 120 }),
  appBuild: integer("app_build"),
  pushToken: varchar("push_token", { length: 255 }),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Audit log (who did what) ──
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id"),
  actor: varchar("actor", { length: 64 }).notNull().default("system"),
  action: varchar("action", { length: 80 }).notNull(),
  detail: jsonb("detail").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Telco webhook events (idempotent inbox) ──
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 64 }).notNull().default("telco"),
  event: varchar("event", { length: 64 }).notNull(),
  providerRef: varchar("provider_ref", { length: 80 }).notNull(),
  msisdn: varchar("msisdn", { length: 32 }),
  status: varchar("status", { length: 16 }).notNull().default("received"),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Idempotency keys for mobile sync replay ──
export const idempotencyKeys = pgTable("idempotency_keys", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  subscriberId: integer("subscriber_id"),
  endpoint: varchar("endpoint", { length: 80 }).notNull().default("mobile-sync"),
  response: jsonb("response").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Agent Mode: build tasks + runs ──
export const agentTasks = pgTable("agent_tasks", {
  id: serial("id").primaryKey(),
  phase: varchar("phase", { length: 64 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  detail: text("detail"),
  status: varchar("status", { length: 16 }).notNull().default("todo"),
  progress: integer("progress").notNull().default(0),
  owner: varchar("owner", { length: 64 }).notNull().default("agent"),
  sort: integer("sort").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const agentRuns = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id"),
  action: varchar("action", { length: 80 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("success"),
  output: jsonb("output").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Subscriber = typeof subscribers.$inferSelect;
export type WellnessActivity = typeof wellnessActivities.$inferSelect;
export type WellnessLog = typeof wellnessLogs.$inferSelect;
export type DcbPlan = typeof dcbPlans.$inferSelect;
export type DcbSubscription = typeof dcbSubscriptions.$inferSelect;
export type DcbTransaction = typeof dcbTransactions.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type HealthTip = typeof healthTips.$inferSelect;
export type VerificationEvidence = typeof verificationEvidence.$inferSelect;
export type FraudEvent = typeof fraudEvents.$inferSelect;
export type HealthConnection = typeof healthConnections.$inferSelect;
export type HealthRecord = typeof healthRecords.$inferSelect;
export type HealthSync = typeof healthSyncs.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type AgentTask = typeof agentTasks.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
