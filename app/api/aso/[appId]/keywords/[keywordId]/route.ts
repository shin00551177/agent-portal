import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ keywordId: string }> }) {
  const { keywordId } = await params;
  await db.asoKeyword.update({ where: { id: keywordId }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
