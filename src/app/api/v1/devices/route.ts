import { db } from "@/db";
import { devices, subscribers } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { withApi, readJson } from "@/server/http";
import { ok, badRequest } from "@/server/errors";
import { deviceSchema, parseOrThrow } from "@/server/validation";
import { normalizeMsisdn } from "@/lib/dcb";
import { audit } from "@/server/services/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(async ({ url }) => {
  const subscriberId = Number(url.searchParams.get("subscriberId"));
  const rows = subscriberId
    ? await db.select().from(devices).where(eq(devices.subscriberId, subscriberId)).orderBy(desc(devices.lastSeenAt))
    : await db.select().from(devices).orderBy(desc(devices.lastSeenAt)).limit(100);
  return ok({ devices: rows });
}, { scope: "v1-devices" });

export const POST = withApi(async ({ req }) => {
  const body = parseOrThrow(deviceSchema, await readJson(req));
  let subscriberId = body.subscriberId ?? null;
  if (!subscriberId && body.msisdn) {
    const [s] = await db.select().from(subscribers).where(eq(subscribers.msisdn, normalizeMsisdn(body.msisdn)));
    if (!s) throw badRequest("Unknown msisdn — bootstrap first");
    subscriberId = s.id;
  }
  if (!subscriberId) throw badRequest("subscriberId or msisdn required");

  const found = (await db.select().from(devices).where(eq(devices.deviceId, body.deviceId)))[0];
  if (found) {
    await db.execute(sql`update devices set subscriber_id=${subscriberId}, platform=${body.platform},
      model=${body.model || null}, app_build=${body.appBuild ?? null},
      push_token=${body.pushToken || null}, last_seen_at=now() where id=${found.id}`);
    const [u] = await db.select().from(devices).where(eq(devices.id, found.id));
    return ok({ device: u, updated: true });
  }
  const [row] = await db.insert(devices).values({
    subscriberId, deviceId: body.deviceId, platform: body.platform,
    model: body.model, appBuild: body.appBuild, pushToken: body.pushToken,
  }).returning();
  await audit(subscriberId, "device.registered", { deviceId: body.deviceId, platform: body.platform });
  return ok({ device: row });
}, { scope: "v1-devices" });
