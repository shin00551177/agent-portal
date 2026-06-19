import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncYouTubeForApp } from "@/lib/youtubeSync";

// POST /api/cron/sns-stats
// 全アクティブアプリの YouTube 動画データを定期取得する（読み取り専用）。
// CRON_SECRET による Bearer 認証（sns-hypotheses と同方式）。
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const activeApps = await db.snsApp.findMany({ where: { active: true } });

  // per-app isolation: one failure doesn't kill the rest
  const results = await Promise.all(
    activeApps.map(async (app) => {
      try {
        const r = await syncYouTubeForApp(app.id);
        return { appId: app.id, accounts: r.length, videos: r.reduce((s, x) => s + x.videos, 0), errors: r.filter((x) => x.error) };
      } catch (e) {
        return { appId: app.id, accounts: 0, videos: 0, errors: [{ error: e instanceof Error ? e.message : String(e) }] };
      }
    })
  );

  return NextResponse.json({ results, timestamp: new Date().toISOString() });
}
