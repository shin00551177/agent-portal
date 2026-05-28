import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string; draftId: string }> }
) {
  const { draftId } = await params;
  const { status } = await req.json();
  if (!["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const draft = await db.snsDraft.update({ where: { id: draftId }, data: { status } });
  return NextResponse.json(draft);
}
