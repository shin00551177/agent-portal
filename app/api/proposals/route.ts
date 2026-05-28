import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/proposals?status=pending&domain=aso&targetId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status")   ?? undefined;
  const domain   = searchParams.get("domain")   ?? undefined;
  const targetId = searchParams.get("targetId") ?? undefined;

  const proposals = await db.proposal.findMany({
    where: {
      ...(status   ? { status }   : {}),
      ...(domain   ? { domain }   : {}),
      ...(targetId ? { targetId } : {}),
    },
    include: { analysisRun: { select: { id: true, domain: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(proposals);
}

// POST /api/proposals  — analysis jobs が提案を登録する
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PORTAL_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    domain, targetType, targetId,
    title, summary, rationale,
    decisionType = "yesno", options,
    actionType, actionPayload,
    sourceJobId, sourceData,
  } = body;

  if (!domain || !title || !summary || !rationale || !actionType) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const proposal = await db.proposal.create({
    data: {
      domain, targetType, targetId,
      title, summary, rationale,
      decisionType, options,
      actionType, actionPayload,
      sourceJobId, sourceData,
    },
  });

  return NextResponse.json(proposal, { status: 201 });
}
