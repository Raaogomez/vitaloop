import { db } from "@/db";
import { dcbPlans } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(dcbPlans);
  return Response.json({ ok: true, plans: rows });
}
