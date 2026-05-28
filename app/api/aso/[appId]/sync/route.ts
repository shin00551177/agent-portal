import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { fetchKeywordRankings, fetchKeywordMetrics, fetchAppMetrics } from "@/lib/apptweak";
import { isAuthenticated } from "@/lib/auth";

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
  const keywords = app.keywords.map((k) => k.keyword);

  // 前回レポートを取得（前週比計算用）
  const prevReport = await db.asoReport.findFirst({
    where: { appId, date: { lt: today } },
    orderBy: { date: "desc" },
  });
  const prevData = (prevReport?.data ?? {}) as Record<string, unknown>;

  // Apptweak からデータ取得
  const [rankings, metrics, kwMetrics] = await Promise.all([
    keywords.length > 0
      ? fetchKeywordRankings(app.iosId, keywords, app.country, app.language)
      : Promise.resolve({}),
    fetchAppMetrics(app.iosId, app.country),
    keywords.length > 0
      ? fetchKeywordMetrics(keywords, app.country, app.language)
      : Promise.resolve({}),
  ]);

  // レポートデータ構築
  type RankResult = { rank: number | null; installs: number | null };
  type KwMetricResult = { volume: number | null; difficulty: number | null };
  const typedRankings = rankings as Record<string, RankResult>;
  const typedKwMetrics = kwMetrics as Record<string, KwMetricResult>;

  const reportData = {
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

  // AsoReport に保存（同日なら上書き）
  const existing = await db.asoReport.findFirst({ where: { appId, date: today } });
  const report = existing
    ? await db.asoReport.update({
        where: { id: existing.id },
        data: { data: reportData, downloads: metrics.downloads, store: "apple", country: app.country },
      })
    : await db.asoReport.create({
        data: {
          appId,
          date: today,
          data: reportData,
          downloads: metrics.downloads,
          store: "apple",
          country: app.country,
          slackSent: false,
        },
      });

  // Slack 通知
  const slackMsg = buildSlackMessage(app.name, reportData, today);
  const slackSent = await sendSlack(slackMsg);

  if (slackSent) {
    await db.asoReport.update({ where: { id: report.id }, data: { slackSent: true } });
  }

  await writeAuditLog({
    action: "aso_sync",
    targetTable: "AsoReport",
    targetId: report.id,
    afterValue: { appId, date: today, keywords: keywords.length },
    req,
  });

  return NextResponse.json({ reportId: report.id, date: today, data: reportData });
}

// ─── Slack メッセージ生成 ───────────────────────────────────────────────────

function rankArrow(current: number | null, prev: number | null): string {
  if (current === null || current >= 500) return "圏外";
  if (prev === null || prev >= 500) return `${current}位 🆕`;
  if (current < prev) return `${current}位 ↑${prev - current}`;
  if (current > prev) return `${current}位 ↓${current - prev}`;
  return `${current}位 →`;
}

function buildSlackMessage(
  appName: string,
  data: ReturnType<typeof buildReportData>,
  date: string,
): string {
  const m = data.appMetrics;
  const pm = (data.prevAppMetrics ?? {}) as typeof m;

  const dlDiff = m.downloads && pm?.downloads
    ? ` (${m.downloads > pm.downloads ? "+" : ""}${m.downloads - pm.downloads} vs 前回)`
    : "";

  const kwLines = (data.keywords ?? [])
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((k) => `  • ${k.keyword}: ${rankArrow(k.rank, k.prevRank)}  vol:${k.volume ?? "?"} diff:${k.difficulty ?? "?"}`)
    .join("\n");

  return [
    `📊 *${appName} ASO 週次レポート* (${date})`,
    "",
    "*📱 アプリ指標*",
    `  DL数: ${m.downloads ?? "?"}${dlDiff}`,
    `  売上: $${m.revenues ?? "?"} ${m.revenueCurrency}`,
    `  評価: ${m.ratingsAvg ?? "?"} (${m.ratingsTotal ?? "?"}件)`,
    `  App Power: ${m.appPower ?? "?"}/10`,
    "",
    "*🔍 キーワード順位*",
    kwLines || "  キーワード未登録",
    "",
    "_Agent Portal: https://agent-portal-production-ba67.up.railway.app/aso_",
  ].join("\n");
}

// 型補完用
type ReportData = {
  keywords: { keyword: string; rank: number | null; installs: number | null; volume: number | null; difficulty: number | null; prevRank: number | null }[];
  appMetrics: { downloads: number | null; revenues: number | null; revenueCurrency: string; ratingsAvg: number | null; ratingsTotal: number | null; appPower: number | null };
  prevAppMetrics: unknown;
  syncedAt: string;
};
function buildReportData(data: ReportData) { return data; }

async function sendSlack(text: string): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_ASO_CHANNEL ?? "C099MB6KC21"; // #dev_twomi

  if (!token) return false;

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel, text }),
    });
    const json = await res.json();
    return json.ok === true;
  } catch {
    return false;
  }
}
