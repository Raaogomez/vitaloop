import { db } from "@/db";
import { sql } from "drizzle-orm";
import { withApi } from "@/server/http";
import { ok, forbidden, badRequest } from "@/server/errors";
import { requireCron } from "@/server/auth";
import { runRenewals } from "@/server/services/billing";
import { settleChallenges } from "@/server/services/challenges";
import { audit } from "@/server/services/audit";

export const dynamic = "force-dynamic";

const JOBS = [
  { id: "renewals", desc: "Charge active subs past next_billing_at", schedule: "every 15 min" },
  { id: "challenge-settlement", desc: "Complete enrollments past target", schedule: "hourly" },
  { id: "trust-recalc", desc: "Clamp + decay trust scores", schedule: "daily" },
  { id: "dunning", desc: "Count failed charges needing retry", schedule: "every 6h" },
];

export const GET = withApi(async () => ok({ jobs: JOBS }), { scope: "v1-jobs" });

export const POST = withApi(async ({ req, url }) => {
  if (!requireCron(req)) throw forbidden("Cron secret required (x-cron-secret).");
  const id = url.searchParams.get("id") || (await req.json().catch(() => ({})) as { id?: string }).id;
  if (!id) throw badRequest("job id required (?id=renewals)");

  if (id === "renewals") {
    const res = await runRenewals();
    await audit(null, "job.renewals", res, "cron");
    return ok({ job: id, ...res });
  }
  if (id === "challenge-settlement") {
    const res = await settleChallenges();
    await audit(null, "job.settlement", res, "cron");
    return ok({ job: id, ...res });
  }
  if (id === "trust-recalc") {
    await db.execute(sql`update subscribers set trust_score = greatest(0, least(100, trust_score))`);
    const r = await db.execute(sql`select count(*)::int as c from subscribers`);
    const c = (r as unknown as { rows: { c: number }[] }).rows[0]?.c ?? 0;
    await audit(null, "job.trust-recalc", { subscribers: c }, "cron");
    return ok({ job: id, subscribers: c });
  }
  if (id === "dunning") {
    const r = await db.execute(sql`select count(*)::int as c from dcb_transactions
      where status='failed' and type='charge' and created_at > now() - interval '7 days'`);
    const c = (r as unknown as { rows: { c: number }[] }).rows[0]?.c ?? 0;
    return ok({ job: id, failedCharges7d: c, action: "retry windows: salary days + evenings" });
  }
  throw badRequest(`Unknown job: ${id}`);
}, { scope: "v1-jobs" });
