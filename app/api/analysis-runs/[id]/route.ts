import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/analysis-runs/[id]  — status / summary を更新（done / failed）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PORTAL_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status, summary } = await req.json();

  const run = await db.analysisRun.update({
    where: { id },
    data: {
      ...(status  ? { status }  : {}),
      ...(summary ? { summary } : {}),
      ...(status === "done" || status === "failed" ? { finishedAt: new Date() } : {}),
    },
  });

  return NextResponse.json(run);
}
