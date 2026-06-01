import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const learnings = await db.snsLearning.findMany({
    where: { appId },
    orderBy: [{ active: "desc" }, { type: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(learnings);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const { type, content, platform, source } = await req.json();
  if (!type || !content) {
    return NextResponse.json({ error: "type と content が必要です" }, { status: 400 });
  }
  const learning = await db.snsLearning.create({
    data: { appId, type, content, platform: platform ?? null, source: source ?? "human" },
  });
  return NextResponse.json(learning, { status: 201 });
}
