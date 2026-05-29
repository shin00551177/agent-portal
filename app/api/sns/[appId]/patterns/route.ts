import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const patterns = await db.snsPattern.findMany({
    where: { appId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(patterns);
}
