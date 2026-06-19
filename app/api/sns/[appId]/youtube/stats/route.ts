import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { syncYouTubeForApp } from "@/lib/youtubeSync";

// GET /api/sns/[appId]/youtube/stats
// 保存済みの最新動画データ（動画ごとに最新のSnsVideoStat 1件）をアカウント別に返す。読み取り専用。
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;

  const accounts = await db.snsAccount.findMany({
    where: { appId, platform: "youtube" },
    orderBy: { username: "asc" },
  });

  // 動画ごとに最新の1件を取得（fetchedAt 降順）。動画数が多くないため、appId分を取得して集約。
  const rows = await db.snsVideoStat.findMany({
    where: { appId, platform: "youtube" },
    orderBy: { fetchedAt: "desc" },
  });

  const latestByVideo = new Map<string, typeof rows[number]>();
  for (const r of rows) {
    if (!latestByVideo.has(r.videoId)) latestByVideo.set(r.videoId, r);
  }
  const latest = [...latestByVideo.values()];

  const byAccount = accounts.map((a) => {
    const videos = latest
      .filter((v) => v.accountId === a.id)
      .sort((x, y) => (y.publishedAt?.getTime() ?? 0) - (x.publishedAt?.getTime() ?? 0));
    return {
      account: { id: a.id, username: a.username, url: a.url, channelId: a.channelId, lastSyncedAt: a.lastSyncedAt },
      totals: {
        videos: videos.length,
        views: videos.reduce((s, v) => s + v.views, 0),
        likes: videos.reduce((s, v) => s + v.likes, 0),
        comments: videos.reduce((s, v) => s + v.comments, 0),
      },
      videos,
    };
  });

  return NextResponse.json({ accounts: byAccount });
}

// POST /api/sns/[appId]/youtube/stats
// YouTube から最新データを取得して SnsVideoStat に保存（同期）。認証必須（内部データ更新を伴うため）。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { appId } = await params;
  const body = await req.json().catch(() => ({})) as { maxVideos?: number };
  const results = await syncYouTubeForApp(appId, body.maxVideos ?? 50);
  return NextResponse.json({ results, syncedAt: new Date().toISOString() });
}
