// ── Zod request schemas for the v1 API ──
import { z } from "zod";

export const msisdnSchema = z.string().min(7).max(20);

export const bootstrapSchema = z.object({
  msisdn: msisdnSchema,
  displayName: z.string().max(120).optional(),
  device: z
    .object({
      deviceId: z.string().max(80).optional(),
      platform: z.enum(["android", "ios", "pwa", "web"]).default("android"),
      appBuild: z.number().int().optional(),
      pushToken: z.string().max(255).optional(),
    })
    .optional(),
});

export const logItemSchema = z.object({
  clientId: z.string().max(64),
  activityKey: z.string().max(64).optional(),
  activityId: z.number().int().optional(),
  quantity: z.number().positive().max(1000),
  loggedAt: z.string().datetime({ offset: true }).or(z.string()).optional(),
  mood: z.string().max(16).optional(),
  note: z.string().max(500).optional(),
  evidence: z
    .array(
      z.object({
        method: z.enum(["photo", "timer", "peer", "sensor", "quiz", "checkin-pair"]),
        detail: z.string().max(1000),
        witnessMsisdn: z.string().max(32).optional(),
      })
    )
    .max(4)
    .optional(),
});

export const healthRecordSchema = z.object({
  recordType: z.string().max(48),
  value: z.number(),
  unit: z.string().max(24).optional(),
  startTime: z.string(),
  endTime: z.string(),
  sourceApp: z.string().max(120).optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
});

export const mobileSyncSchema = z.object({
  msisdn: msisdnSchema.optional(),
  subscriberId: z.number().int().optional(),
  deviceId: z.string().max(80).optional(),
  logs: z.array(logItemSchema).max(200).default([]),
  healthRecords: z.array(healthRecordSchema).max(200).default([]),
});

export const deviceSchema = z.object({
  subscriberId: z.number().int().optional(),
  msisdn: msisdnSchema.optional(),
  deviceId: z.string().max(80),
  platform: z.enum(["android", "ios", "pwa", "web"]).default("android"),
  model: z.string().max(120).optional(),
  appBuild: z.number().int().optional(),
  pushToken: z.string().max(255).optional(),
});

export const webhookSchema = z.object({
  event: z.enum(["charge.confirmed", "charge.failed", "subscription.stopped", "refund.issued", "consent.revoked"]),
  msisdn: msisdnSchema,
  operator: z.string().max(64).optional(),
  providerRef: z.string().max(80),
  amountMinor: z.number().int().optional(),
  errorCode: z.string().max(32).optional(),
  occurredAt: z.string().optional(),
});

export const agentTaskPatch = z.object({
  status: z.enum(["todo", "doing", "done", "blocked"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
  owner: z.string().max(64).optional(),
});

import { ApiError } from "./errors";

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const res = schema.safeParse(input);
  if (!res.success) {
    throw new ApiError("BAD_REQUEST", "Validation failed", res.error.flatten());
  }
  return res.data;
}
