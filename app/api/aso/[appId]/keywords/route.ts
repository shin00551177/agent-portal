import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const { keyword, priority } = await req.json();
  if (!keyword) return NextResponse.json({ error: "keyword required" }, { status: 400 });

  const created = await db.asoKeyword.upsert({
    where: { appId_keyword: { appId, keyword } },
    create: { appId, keyword, priority: priority ?? "medium" },
    update: { active: true, priority: priority ?? "medium" },
  });
  return NextResponse.json(created, { status: 201 });
}
