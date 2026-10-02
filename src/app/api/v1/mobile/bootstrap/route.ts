import { db } from "@/db";
import { devices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withApi, readJson } from "@/server/http";
import { ok, badRequest } from "@/server/errors";
import { bootstrapSchema, parseOrThrow } from "@/server/validation";
import { mintSession } from "@/server/auth";
import { ensureSubscriber, listPlans, subscriptionHistory } from "@/server/services/billing";
import { listActivities } from "@/server/services/wellness";
import { listChallenges, progress as challengeProgress, verifiedWeek } from "@/server/services/challenges";
import { trustSummary } from "@/server/services/verification";
import { normalizeMsisdn } from "@/lib/dcb";
import { config } from "@/server/config";

export const dynamic = "force-dynamic";

// One-call mobile start: identity + session + catalog + status
export const POST = withApi(async ({ req }) => {
  const body = parseOrThrow(bootstrapSchema, await readJson(req));
  if (!body.msisdn) throw badRequest("msisdn required");
  const sub = await ensureSubscriber(body.msisdn, body.displayName);
  const msisdn = normalizeMsisdn(body.msisdn);
  const token = mintSession(sub.id, msisdn);

  if (body.device?.deviceId) {
    const found = await db.select().from(devices).where(eq(devices.deviceId, body.device.deviceId));
    if (!found[0]) {
      await db.insert(devices).values({
        subscriberId: sub.id,
        deviceId: body.device.deviceId,
        platform: body.device.platform || "android",
        appBuild: body.device.appBuild,
        pushToken: body.device.pushToken,
      });
    }
  }

  const [plans, activities, challenges, subs, trust, enrolled, vWeek] = await Promise.all([
    listPlans(),
    listActivities(),
    listChallenges(),
    subscriptionHistory(msisdn),
    trustSummary(sub.id).catch(() => null),
    challengeProgress(sub.id).catch(() => []),
    verifiedWeek(sub.id).catch(() => 0),
  ]);

  const active = subs.find((s) => s.status === "active") || null;

  return ok({
    subscriber: sub,
    session: { token, scheme: "Bearer" },
    subscription: active,
    subscriptionHistory: subs.slice(0, 5),
    trust,
    verifiedWeek: vWeek,
    catalog: { plans, activities, challenges },
    enrollments: enrolled,
    config: {
      minBuild: config.mobile.minSupportedBuild,
      syncBatchMax: config.mobile.syncBatchMax,
      dcbMode: config.dcb.mode,
    },
  });
}, { scope: "v1-bootstrap" });
