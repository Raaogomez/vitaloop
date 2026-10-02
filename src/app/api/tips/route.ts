import { db } from "@/db";
import { healthTips } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(healthTips);
  return Response.json({ ok: true, tips: rows });
}
