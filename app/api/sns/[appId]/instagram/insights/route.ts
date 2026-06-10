import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { getMediaInsights, getAccountSnapshot, getRecentMedia } from "@/lib/instagram";

// GET /api/sns/[appId]/instagram/insights
// 投稿済み仮説のIGインサイトを取得し、metrics に保存する（測定 = No.6）。
// 読み取りのみだが、内部データ更新を伴うため認証必須。
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { appId } = await params;
  if (appId !== "twomi") {
    return NextResponse.json({ error: "instagram insights only configured for twomi" }, { status: 400 });
  }

  // 投稿済み（igMediaIdあり）の仮説のインサイトを更新
  const posted = await db.snsHypothesis.findMany({
    where: { appId, status: { in: ["posted", "measured"] } },
    orderBy: { postedAt: "desc" },
    take: 20,
  });

  const results: Array<{ hypothesisId: string; mediaId: string; insights: Record<string, number> }> = [];
  for (const h of posted) {
    const mediaId = (h.metrics as { igMediaId?: string } | null)?.igMediaId;
    if (!mediaId) continue;
    try {
      const insights = await getMediaInsights(mediaId);
      await db.snsHypothesis.update({
        where: { id: h.id },
        data: { status: "measured", metrics: { igMediaId: mediaId, ...insights, measuredAt: new Date().toISOString() } },
      });
      results.push({ hypothesisId: h.id, mediaId, insights });
    } catch {
      // 個別失敗はスキップ（メディア削除済み等）
      continue;
    }
  }

  const account = await getAccountSnapshot().catch(() => null);
  const recent = await getRecentMedia(5).catch(() => []);

  return NextResponse.json({ updated: results.length, results, account, recentMedia: recent });
}
