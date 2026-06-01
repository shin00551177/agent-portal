import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const hypotheses = await db.snsHypothesis.findMany({
    where: { appId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(hypotheses);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const body = await req.json();
  const hypothesis = await db.snsHypothesis.create({
    data: {
      appId,
      platform: body.platform,
      hypothesis: body.hypothesis,
      reasoning: body.reasoning,
      targetAudience: body.targetAudience ?? null,
      format: body.format ?? null,
      contentBrief: body.contentBrief ?? null,
      status: "pending",
    },
  });
  return NextResponse.json(hypothesis, { status: 201 });
}
