import { withApi } from "@/server/http";
import { ok, forbidden } from "@/server/errors";
import { requireAdmin } from "@/server/auth";
import { overview } from "@/server/services/admin";
import { auditList } from "@/server/services/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(async ({ req }) => {
  if (!requireAdmin(req)) throw forbidden("Admin key required (x-admin-key). Demo key: dev-admin-key");
  const [data, audits] = await Promise.all([overview(), auditList(25)]);
  return ok({ ...data, recentAudit: audits });
}, { scope: "v1-admin" });
