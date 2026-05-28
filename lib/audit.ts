import { db } from "./db";
import { NextRequest } from "next/server";

type AuditParams = {
  action: string;
  targetTable: string;
  targetId: string;
  beforeValue?: Record<string, unknown> | null;
  afterValue?: Record<string, unknown> | null;
  req?: NextRequest;
};

export async function writeAuditLog({
  action,
  targetTable,
  targetId,
  beforeValue,
  afterValue,
  req,
}: AuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action,
        targetTable,
        targetId,
        beforeValue: beforeValue ? JSON.parse(JSON.stringify(beforeValue)) : undefined,
        afterValue:  afterValue  ? JSON.parse(JSON.stringify(afterValue))  : undefined,
        ipAddress:   req?.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req?.headers.get("x-real-ip") ?? null,
        userAgent:   req?.headers.get("user-agent") ?? null,
      },
    });
  } catch (e) {
    console.error("[AuditLog] write failed:", e);
  }
}
