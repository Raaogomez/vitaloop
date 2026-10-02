import { db } from "@/db";
import { subscribers, wellnessLogs, dcbSubscriptions, dcbTransactions } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const subCount = await db.execute(sql`select count(*)::int as c from subscribers`);
  const logCount = await db.execute(sql`select count(*)::int as c from wellness_logs`);
  const points = await db.execute(sql`select coalesce(sum(points_earned),0)::int as c from wellness_logs`);
  const rev = await db.execute(
    sql`select coalesce(sum(amount_minor),0)::int as c from dcb_transactions where status='success' and type='charge'`
  );
  const active = await db.execute(sql`select count(*)::int as c from dcb_subscriptions where status='active'`);
  const byStatus = await db.execute(sql`select status, count(*)::int as c from dcb_subscriptions group by status`);
  const byOperator = await db.execute(sql`select operator, count(*)::int as c from dcb_subscriptions group by operator`);
  const byCategory = await db.execute(sql`
    select wa.category as category, coalesce(sum(wl.points_earned),0)::int as points, count(*)::int as logs
    from wellness_logs wl join wellness_activities wa on wa.id = wl.activity_id
    group by wa.category order by points desc
  `);

  const num = (r: unknown) => Number((r as { rows: { c: number }[] }).rows[0]?.c ?? 0);

  return Response.json({
    ok: true,
    stats: {
      subscribers: num(subCount),
      logs: num(logCount),
      points: num(points),
      revenueMinor: num(rev),
      activeSubs: num(active),
      byStatus: byStatus.rows,
      byOperator: byOperator.rows,
      byCategory: byCategory.rows,
    },
  });
}

// keep imports used
void subscribers; void wellnessLogs; void dcbSubscriptions; void dcbTransactions;
