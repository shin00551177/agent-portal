import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/analysis/summary?days=7
// 分析ジョブが Claude に渡すデータを返す
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PORTAL_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "7", 10);
  const since = new Date(Date.now() - days * 86400 * 1000);
  const periodLabel = `${since.toISOString().slice(0, 10)} ~ ${new Date().toISOString().slice(0, 10)}`;

  const [snsApps, asoApps] = await Promise.all([
    db.snsApp.findMany({ where: { active: true } }),
    db.asoApp.findMany({ where: { active: true }, include: { keywords: { where: { active: true } } } }),
  ]);

  // ego hits per SNS app
  const egoSummaries = await Promise.all(
    snsApps.map(async (app) => {
      const hits = await db.egoHit.findMany({
        where: { appId: app.id, createdAt: { gte: since } },
        orderBy: { score: "desc" },
      });

      const bySource   = _count(hits, (h) => h.source);
      const bySentiment = _count(hits, (h) => h.sentiment ?? "unknown");
      const byFeedback = _count(
        hits.filter((h) => h.feedbackType),
        (h) => h.feedbackType!,
      );

      return {
        appId:    app.id,
        appName:  app.name,
        total:    hits.length,
        bySource,
        bySentiment,
        byFeedbackType: byFeedback,
        topNegative: hits
          .filter((h) => h.sentiment === "negative")
          .slice(0, 5)
          .map(_hitSummary),
        topBuzz: hits
          .filter((h) => h.category === "buzz")
          .slice(0, 5)
          .map(_hitSummary),
        recentReviews: hits
          .filter((h) => h.source === "appstore" || h.source === "playstore")
          .slice(0, 10)
          .map(_hitSummary),
      };
    }),
  );

  // ASO: latest report per app
  const asoSummaries = await Promise.all(
    asoApps.map(async (app) => {
      const latestReport = await db.asoReport.findFirst({
        where: { appId: app.id },
        orderBy: { createdAt: "desc" },
      });
      return {
        appId:    app.id,
        appName:  app.name,
        keywords: app.keywords.map((k) => ({ keyword: k.keyword, priority: k.priority })),
        latestReport: latestReport
          ? { date: latestReport.date, data: latestReport.data }
          : null,
      };
    }),
  );

  return NextResponse.json({
    period: periodLabel,
    days,
    generatedAt: new Date().toISOString(),
    ego:  egoSummaries,
    aso:  asoSummaries,
  });
}

function _count<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function _hitSummary(h: {
  source: string; title: string; url: string;
  snippet: string | null; sentiment: string | null;
  feedbackType: string | null; score: number;
}) {
  return {
    source:       h.source,
    title:        h.title,
    url:          h.url,
    snippet:      h.snippet?.slice(0, 150),
    sentiment:    h.sentiment,
    feedbackType: h.feedbackType,
    score:        h.score,
  };
}
