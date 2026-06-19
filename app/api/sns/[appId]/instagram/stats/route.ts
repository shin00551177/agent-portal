import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { syncInstagramForApp } from "@/lib/instagramSync";

// GET /api/sns/[appId]/instagram/stats
// 保存済みの最新IGメディアデータ（メディアごとに最新1件）をアカウント別に返す。読み取り専用。
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;

  const accounts = await db.snsAccount.findMany({
    where: { appId, platform: "instagram" },
    orderBy: { username: "asc" },
  });

  const rows = await db.snsVideoStat.findMany({
    where: { appId, platform: "instagram" },
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
      account: { id: a.id, username: a.username, url: a.url, igUserId: a.igUserId, lastSyncedAt: a.lastSyncedAt },
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

// POST /api/sns/[appId]/instagram/stats
// IG から最新データを取得して SnsVideoStat に保存（同期）。認証必須。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { appId } = await params;
  const body = await req.json().catch(() => ({})) as { maxMedia?: number };
  const results = await syncInstagramForApp(appId, body.maxMedia ?? 50);
  return NextResponse.json({ results, syncedAt: new Date().toISOString() });
}
