import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { fetchKeywordRankings, fetchKeywordMetrics, fetchAppMetrics, fetchKeywordRankingHistory } from "@/lib/apptweak";
import { isAuthenticated } from "@/lib/auth";
import { sendSlackError, sendSlackHalt } from "@/lib/slack-alert";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  // セッション認証（ブラウザ経由）または未認証のまま許可（内部 cron 用）
  // TODO: cron スクリプト側で SYNC_SECRET を使う形に移行
  const isLoggedIn = await isAuthenticated();
  const syncSecret = process.env.SYNC_SECRET;
  if (!isLoggedIn && syncSecret && req.headers.get("x-sync-secret") !== syncSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { appId } = await params;

  const app = await db.asoApp.findUnique({
    where: { id: appId },
    include: { keywords: { where: { active: true } } },
  });
  if (!app) return NextResponse.json({ error: "app not found" }, { status: 404 });
  if (!app.iosId) return NextResponse.json({ error: "iosId not set" }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);

  try {
  const keywords = app.keywords.map((k) => k.keyword);

  // リクエストボディから期間指定を読み取る（省略時は今日のスナップショット）
  const body = await req.json().catch(() => ({})) as { startDate?: string; endDate?: string };
  const startDate = body.startDate ?? null;
  const endDate = body.endDate ?? today;
  const isRangeQuery = !!startDate && startDate !== endDate;

  // 前回レポートを取得（前週比計算用、スナップショット時のみ）
  const prevReport = isRangeQuery ? null : await db.asoReport.findFirst({
    where: { appId, date: { lt: today } },
    orderBy: { date: "desc" },
  });
  const prevData = (prevReport?.data ?? {}) as Record<string, unknown>;

  // Apptweak からデータ取得
  const [rankings, metrics, kwMetrics, rankingHistory] = await Promise.all([
    keywords.length > 0 && !isRangeQuery
      ? fetchKeywordRankings(app.iosId, keywords, app.country, app.language)
      : Promise.resolve({}),
    !isRangeQuery
      ? fetchAppMetrics(app.iosId, app.country)
      : Promise.resolve(null),
    keywords.length > 0
      ? fetchKeywordMetrics(keywords, app.country, app.language)
      : Promise.resolve({}),
    keywords.length > 0 && isRangeQuery
      ? fetchKeywordRankingHistory(app.iosId, keywords, startDate!, endDate, app.country, app.language)
      : Promise.resolve(null),
  ]);

  // レポートデータ構築
  type RankResult = { rank: number | null; installs: number | null };
  type KwMetricResult = { volume: number | null; difficulty: number | null };
  const typedRankings = rankings as Record<string, RankResult>;
  const typedKwMetrics = kwMetrics as Record<string, KwMetricResult>;

  const reportData = isRangeQuery ? {
    // 期間指定クエリ：履歴トレンドデータ
    periodFrom: startDate!,
    periodTo: endDate,
    isRangeQuery: true,
    rankingHistory: rankingHistory,  // { keyword: { date: rank } }
    keywords: keywords.map((kw) => ({
      keyword: kw,
      rank: null,           // 今日の順位は取得しない
      installs: null,
      volume: typedKwMetrics[kw]?.volume ?? null,
      difficulty: typedKwMetrics[kw]?.difficulty ?? null,
      prevRank: null,
    })),
    appMetrics: null,
    prevAppMetrics: null,
    syncedAt: new Date().toISOString(),
  } : {
    // スナップショット（通常の今日のデータ）
    periodFrom: prevReport?.date ?? today,
    periodTo: today,
    keywords: Object.entries(typedRankings).map(([kw, r]) => ({
      keyword: kw,
      rank: r.rank,
      installs: r.installs,
      volume: typedKwMetrics[kw]?.volume ?? null,
      difficulty: typedKwMetrics[kw]?.difficulty ?? null,
      prevRank: (prevData.keywords as { keyword: string; rank: number | null }[] | undefined)
        ?.find((p) => p.keyword === kw)?.rank ?? null,
    })),
    appMetrics: metrics,
    prevAppMetrics: prevData.appMetrics ?? null,
    syncedAt: new Date().toISOString(),
  };

  // AsoReport に保存（期間クエリは専用日付キー、スナップショットは同日上書き）
  const reportDate = isRangeQuery ? `range:${startDate}:${endDate}` : today;
  const existing = await db.asoReport.findFirst({ where: { appId, date: reportDate } });
  const report = existing
    ? await db.asoReport.update({
        where: { id: existing.id },
        data: { data: reportData, store: "apple", country: app.country },
      })
    : await db.asoReport.create({
        data: {
          appId,
          date: reportDate,
          data: reportData,
          downloads: isRangeQuery ? null : (metrics as Awaited<ReturnType<typeof fetchAppMetrics>>).downloads,
          store: "apple",
          country: app.country,
          slackSent: false,
        },
      });

  // Slack 通知は Web UI で確認後に手動送信するため自動送信しない

  await writeAuditLog({
    action: "aso_sync",
    targetTable: "AsoReport",
    targetId: report.id,
    afterValue: { appId, date: today, keywords: keywords.length },
    req,
  });

  // スナップショット時のみ自動で分析・提案生成（fire-and-forget）
  if (!isRangeQuery) {
    const baseUrl = req.nextUrl.origin;
    const analyzeHeaders: Record<string, string> = {};
    if (syncSecret) analyzeHeaders["x-sync-secret"] = syncSecret;
    fetch(`${baseUrl}/api/aso/${appId}/analyze`, { method: "POST", headers: analyzeHeaders })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.text().catch(() => r.statusText);
          await sendSlackError({ step: "analyze", appId, appName: app.name, error: `HTTP ${r.status}: ${body}` });
        }
      })
      .catch((err) => sendSlackError({ step: "analyze", appId, appName: app.name, error: err }));
  }

  // 成功時: 連続エラーカウンターをリセット
  if (app.consecutiveErrors > 0) {
    await db.asoApp.update({ where: { id: appId }, data: { consecutiveErrors: 0 } });
  }

  return NextResponse.json({ reportId: report.id, date: today, data: reportData });
  } catch (err) {
    await sendSlackError({ step: "sync", appId, appName: app?.name, error: err });

    // 停止条件チェック (#12)
    const haltConditions = (app.haltConditions ?? {}) as { maxErrors?: number };
    const maxErrors = haltConditions.maxErrors ?? 5;
    const newCount = (app.consecutiveErrors ?? 0) + 1;
    await db.asoApp.update({
      where: { id: appId },
      data: {
        consecutiveErrors: newCount,
        ...(newCount >= maxErrors ? { active: false } : {}),
      },
    });
    if (newCount >= maxErrors) {
      await sendSlackHalt({ appId, appName: app?.name, consecutiveErrors: newCount, maxErrors });
    }

    throw err;
  }
}

