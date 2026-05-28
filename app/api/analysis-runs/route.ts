import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/analysis-runs  — 分析ジョブが実行開始・完了を登録する
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PORTAL_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { domain, targetId, status = "running", summary, finishedAt } = body;

  if (!domain) {
    return NextResponse.json({ error: "domain required" }, { status: 400 });
  }

  const run = await db.analysisRun.create({
    data: {
      domain,
      targetId,
      status,
      summary,
      finishedAt: finishedAt ? new Date(finishedAt) : undefined,
    },
  });

  return NextResponse.json(run, { status: 201 });
}

// GET /api/analysis-runs  — 最近の分析履歴
export async function GET() {
  const runs = await db.analysisRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { _count: { select: { proposals: true } } },
  });
  return NextResponse.json(runs);
}
