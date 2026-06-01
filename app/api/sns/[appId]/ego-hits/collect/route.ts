import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getAppContext } from "@/lib/snsAppContext";

const claude = new Anthropic();

type RawHit = {
  source: string;
  keyword: string;
  title: string;
  url: string;
  snippet: string | null;
  author: string | null;
  publishedAt: string | null;
  views?: number;
  likes?: number;
  comments?: number;
};

// YouTube Data API v3 検索 + 統計取得（views/likes/comments）
async function searchYouTube(query: string, maxResults = 10): Promise<RawHit[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];

  // 1. 検索
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("maxResults", String(maxResults));
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", "relevance");
  searchUrl.searchParams.set("key", key);

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) return [];
  const searchData = await searchRes.json();
  const items = searchData.items ?? [];
  if (items.length === 0) return [];

  // 2. 統計（viewCount/likeCount/commentCount）を一括取得
  const videoIds = items.map((i: { id: { videoId: string } }) => i.id.videoId).join(",");
  const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  statsUrl.searchParams.set("part", "statistics");
  statsUrl.searchParams.set("id", videoIds);
  statsUrl.searchParams.set("key", key);

  const statsRes = await fetch(statsUrl.toString());
  const statsData = statsRes.ok ? await statsRes.json() : { items: [] };
  const statsMap: Record<string, { views: number; likes: number; comments: number }> = {};
  for (const v of statsData.items ?? []) {
    statsMap[v.id] = {
      views:    parseInt(v.statistics.viewCount    ?? "0", 10),
      likes:    parseInt(v.statistics.likeCount    ?? "0", 10),
      comments: parseInt(v.statistics.commentCount ?? "0", 10),
    };
  }

  return items.map((item: {
    id: { videoId: string };
    snippet: { title: string; description: string; channelTitle: string; publishedAt: string };
  }) => {
    const stats = statsMap[item.id.videoId];
    return {
      source: "youtube",
      keyword: query,
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      snippet: item.snippet.description?.slice(0, 200) || null,
      author: item.snippet.channelTitle || null,
      publishedAt: item.snippet.publishedAt || null,
      views:    stats?.views    ?? 0,
      likes:    stats?.likes    ?? 0,
      comments: stats?.comments ?? 0,
    };
  });
}

// Google Custom Search API
async function searchWeb(query: string, maxResults = 10): Promise<RawHit[]> {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx  = process.env.GOOGLE_CSE_ID;
  if (!key || !cx) return [];

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", key);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(maxResults, 10)));
  url.searchParams.set("dateRestrict", "m1"); // 直近1ヶ月

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();

  return (data.items ?? []).map((item: {
    title: string;
    link: string;
    snippet: string;
    displayLink: string;
  }) => ({
    source: "web",
    keyword: query,
    title: item.title,
    url: item.link,
    snippet: item.snippet?.slice(0, 200) || null,
    author: item.displayLink || null,
    publishedAt: null,
  }));
}

// Claude でスコアリング & 分類
async function classifyHits(hits: RawHit[], appName: string): Promise<Array<RawHit & {
  score: number; sentiment: string; category: string; feedbackType: string | null;
}>> {
  if (hits.length === 0) return [];

  const prompt = `以下の検索結果を「${appName}」アプリに関する言及として分析してください。

${hits.map((h, i) => `[${i}] ${h.source} | ${h.title}\n${h.snippet ?? ""}`).join("\n\n")}

各アイテムについてJSON配列で返してください:
[
  {
    "index": 0,
    "score": 1〜100（関連度×重要度。${appName}に無関係なら5以下）,
    "sentiment": "positive" | "negative" | "neutral",
    "category": "buzz" | "feedback" | "other",
    "feedbackType": "bug" | "feature_request" | "praise" | "comparison" | null
  }
]
JSONのみ返してください。`;

  const msg = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: "アプリのSNSモニタリングアナリストとして、JSON形式のみで返してください。",
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "[]";
  let scores: Array<{ index: number; score: number; sentiment: string; category: string; feedbackType: string | null }> = [];
  try {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) scores = JSON.parse(m[0]);
  } catch { /* use defaults */ }

  return hits.map((h, i) => {
    const s = scores.find((x) => x.index === i);
    return {
      ...h,
      score:       s?.score       ?? 10,
      sentiment:   s?.sentiment   ?? "neutral",
      category:    s?.category    ?? "other",
      feedbackType: s?.feedbackType ?? null,
    };
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const appCtx = getAppContext(appId);

    // 既存URLを取得（重複スキップ用）
    const existingUrls = new Set(
      (await db.egoHit.findMany({ where: { appId }, select: { url: true } }))
        .map((h) => h.url)
    );

    // 検索キーワード
    const keywords = [appCtx.name, `${appCtx.name} アプリ`, `${appCtx.name} 使ってみた`];

    // YouTube + Web を並行検索（エラーはcatchして空配列）
    const rawResults = await Promise.allSettled([
      ...keywords.map((kw) => searchYouTube(kw, 5)),
      ...keywords.slice(0, 2).map((kw) => searchWeb(kw, 5)),
    ]);

    const rawHits = rawResults.flatMap((r) => r.status === "fulfilled" ? r.value : []);
    const ytKey   = !!process.env.YOUTUBE_API_KEY;
    const cseKey  = !!process.env.GOOGLE_CSE_KEY && !!process.env.GOOGLE_CSE_ID;
    const allHits = rawHits.filter((h) => !existingUrls.has(h.url));

    if (allHits.length === 0) {
      return NextResponse.json({
        saved: 0, skipped: 0, total_found: rawHits.length,
        debug: { ytKey, cseKey, rawFound: rawHits.length, existingCount: existingUrls.size },
        message: rawHits.length === 0
          ? "検索結果が0件です（APIキーを確認してください）"
          : "新しい言及はありませんでした（全件既存）",
      });
    }

    // Claude でスコアリング
    const classified = await classifyHits(allHits, appCtx.name);

    // エンゲージメントを加味したスコア補正
    const toSave = classified
      .map((h) => {
        const views    = h.views    ?? 0;
        const likes    = h.likes    ?? 0;
        const comments = h.comments ?? 0;
        // バズ指標スコア（最大50pt加算）
        const buzzBonus = Math.min(
          Math.floor(Math.log10(views + 1) * 8) +
          Math.floor(Math.log10(likes + 1) * 5) +
          Math.floor(Math.log10(comments + 1) * 3),
          50
        );
        return { ...h, score: Math.min(h.score + buzzBonus, 100) };
      })
      .filter((h) => h.score >= 10);

    const saved = await Promise.all(
      toSave.map((h) =>
        db.egoHit.create({
          data: {
            appId,
            source: h.source,
            keyword: h.keyword,
            title: h.title,
            url: h.url,
            snippet: h.snippet,
            author: h.author,
            score: h.score,
            publishedAt: h.publishedAt ? new Date(h.publishedAt) : null,
            sentiment: h.sentiment,
            category: h.category,
            feedbackType: h.feedbackType,
            engagement: (h.views || h.likes || h.comments)
              ? { views: h.views, likes: h.likes, comments: h.comments }
              : undefined,
          },
        })
      )
    );

    return NextResponse.json({
      saved: saved.length,
      skipped: classified.length - saved.length,
      total_found: allHits.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
