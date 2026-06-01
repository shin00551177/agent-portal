import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const recs = await db.snsFrequencyRecommendation.findMany({
    where: { appId },
    orderBy: { platform: "asc" },
  });
  return NextResponse.json(recs);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const { platform, adjustedFrequency, currentFrequency } = await req.json();

  const rec = await db.snsFrequencyRecommendation.upsert({
    where: { appId_platform: { appId, platform } },
    update: {
      ...(adjustedFrequency !== undefined && { adjustedFrequency, acceptedAt: new Date() }),
      ...(currentFrequency !== undefined && { currentFrequency }),
    },
    create: {
      appId,
      platform,
      recommendedFrequency: adjustedFrequency ?? 3,
      currentFrequency: currentFrequency ?? null,
      adjustedFrequency: adjustedFrequency ?? null,
      reasoning: "手動設定",
    },
  });
  return NextResponse.json(rec);
}
