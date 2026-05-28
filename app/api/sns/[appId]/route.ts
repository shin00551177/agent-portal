import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const body = await req.json();

  const before = await db.snsApp.findUnique({ where: { id: appId }, select: { active: true, fallbackBehavior: true } });

  const data: Record<string, unknown> = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.fallbackBehavior === "string") data.fallbackBehavior = body.fallbackBehavior;
  if (body.escalationRules !== undefined) data.escalationRules = body.escalationRules;
  if (body.haltConditions  !== undefined) data.haltConditions  = body.haltConditions;
  if (body.agentMeta       !== undefined) data.agentMeta       = body.agentMeta;

  const app = await db.snsApp.update({ where: { id: appId }, data });

  const action = typeof body.active === "boolean" ? "agent_toggled" : "setting_changed";
  await writeAuditLog({
    action,
    targetTable: "SnsApp",
    targetId: appId,
    beforeValue: before as Record<string, unknown>,
    afterValue:  data,
    req,
  });

  return NextResponse.json({ active: app.active, fallbackBehavior: app.fallbackBehavior });
}
