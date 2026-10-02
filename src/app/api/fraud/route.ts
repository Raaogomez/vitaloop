import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const total = await db.execute(sql`select count(*)::int as c from wellness_logs`);
  const flagged = await db.execute(sql`select count(*)::int as c from wellness_logs where flagged = true`);
  const plausible = await db.execute(sql`select count(*)::int as c from wellness_logs where verification_level='plausible'`);
  const verified = await db.execute(sql`select count(*)::int as c from wellness_logs where verification_level in ('verified','certified')`);
  const byCode = await db.execute(sql`
    select code, count(*)::int as c from (
      select jsonb_array_elements_text(coalesce(flag_codes,'[]'::jsonb)) as code from wellness_logs where flagged = true
    ) t group by code order by c desc
  `);
  const byLevel = await db.execute(sql`select verification_level as level, count(*)::int as c from wellness_logs group by verification_level`);
  const num = (r: unknown) => Number((r as { rows: { c: number }[] }).rows[0]?.c ?? 0);
  return Response.json({
    ok: true,
    fraud: {
      total: num(total),
      flagged: num(flagged),
      plausible: num(plausible),
      verified: num(verified),
      flagRate: num(total) ? Math.round((num(flagged) / num(total)) * 100) : 0,
      byCode: byCode.rows,
      byLevel: byLevel.rows,
    },
  });
}
