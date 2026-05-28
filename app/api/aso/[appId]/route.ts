import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.workflowStates !== undefined) data.workflowStates = body.workflowStates;
  if (typeof body.fallbackBehavior === "string") data.fallbackBehavior = body.fallbackBehavior;
  if (body.escalationRules !== undefined) data.escalationRules = body.escalationRules;
  if (body.haltConditions  !== undefined) data.haltConditions  = body.haltConditions;
  if (body.agentMeta       !== undefined) data.agentMeta       = body.agentMeta;

  const app = await db.asoApp.update({ where: { id: appId }, data });
  return NextResponse.json({ active: app.active, workflowStates: app.workflowStates });
}
