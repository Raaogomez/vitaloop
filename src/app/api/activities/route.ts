import { db } from "@/db";
import { wellnessActivities } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(wellnessActivities);
  return Response.json({ ok: true, activities: rows });
}
