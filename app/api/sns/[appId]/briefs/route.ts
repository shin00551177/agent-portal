import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const briefs = await db.snsBrief.findMany({
    where: { appId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(briefs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const body = await req.json();

  const brief = await db.snsBrief.create({
    data: {
      appId,
      platform: body.platform ?? "TikTok",
      targetAge: body.targetAge ?? null,
      scriptContent: body.scriptContent ?? "",
      captions: body.captions ?? [],
      higgsfieldPrompt: body.higgsfieldPrompt ?? null,
    },
  });

  return NextResponse.json(brief, { status: 201 });
}
