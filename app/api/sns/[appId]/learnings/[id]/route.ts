import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string; id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = await db.snsLearning.update({
    where: { id },
    data: {
      ...(body.active    !== undefined && { active:   body.active }),
      ...(body.content   !== undefined && { content:  body.content }),
      ...(body.type      !== undefined && { type:     body.type }),
      ...(body.platform  !== undefined && { platform: body.platform }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string; id: string }> }
) {
  const { id } = await params;
  await db.snsLearning.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
