import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string; hitId: string }> }
) {
  const { hitId } = await params;
  const { dismissed } = await req.json();
  const hit = await db.egoHit.update({ where: { id: hitId }, data: { dismissed: Boolean(dismissed) } });
  return NextResponse.json(hit);
}
