// ── Admin / analytics service ──
import { db } from "@/db";
import { sql } from "drizzle-orm";

const num = (r: unknown) => Number((r as { rows: { c: number }[] }).rows[0]?.c ?? 0);

export async function overview() {
  const [subs, logs, pts, rev, active, devices, flagged, certified, webhooks] = await Promise.all([
    db.execute(sql`select count(*)::int as c from subscribers`),
    db.execute(sql`select count(*)::int as c from wellness_logs`),
    db.execute(sql`select coalesce(sum(points_earned),0)::int as c from wellness_logs`),
    db.execute(sql`select coalesce(sum(amount_minor),0)::int as c from dcb_transactions where status='success' and type='charge'`),
    db.execute(sql`select count(*)::int as c from dcb_subscriptions where status='active'`),
    db.execute(sql`select count(*)::int as c from devices`),
    db.execute(sql`select count(*)::int as c from wellness_logs where flagged=true`),
    db.execute(sql`select count(*)::int as c from wellness_logs where verification_level in ('verified','certified')`),
    db.execute(sql`select count(*)::int as c from webhook_events`),
  ]);
  const byStatus = await db.execute(sql`select status, count(*)::int as c from dcb_subscriptions group by status`);
  const byOperator = await db.execute(sql`select operator, count(*)::int as c from dcb_subscriptions group by operator`);
  const byLevel = await db.execute(sql`select verification_level as level, count(*)::int as c from wellness_logs group by verification_level`);
  const timeseries = await db.execute(sql`
    select to_char(date_trunc('day', created_at), 'MM-DD') as day, count(*)::int as c
    from wellness_logs group by 1 order by 1 desc limit 14`);
  return {
    kpis: {
      subscribers: num(subs), logs: num(logs), points: num(pts),
      revenueMinor: num(rev), activeSubs: num(active), devices: num(devices),
      flagged: num(flagged), certified: num(certified), webhooks: num(webhooks),
    },
    byStatus: byStatus.rows, byOperator: byOperator.rows, byLevel: byLevel.rows,
    timeseries: (timeseries.rows as { day: string; c: number }[]).reverse(),
  };
}

export async function tableCounts() {
  const tables = ["subscribers", "wellness_logs", "dcb_subscriptions", "dcb_transactions", "health_records",
    "devices", "audit_logs", "webhook_events", "challenge_enrollments", "agent_tasks", "agent_runs"];
  const out: Record<string, number> = {};
  for (const t of tables) {
    const r = await db.execute(sql.raw(`select count(*)::int as c from ${t}`));
    out[t] = num(r);
  }
  return out;
}
