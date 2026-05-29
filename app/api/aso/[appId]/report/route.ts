import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { sendSlack } from "@/lib/slack-alert";

// POST /api/aso/[appId]/report  — Slack にレポートを送信

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const syncSecret = process.env.SYNC_SECRET;
  const authed = await isAuthenticated();
  if (!authed && syncSecret && req.headers.get("x-sync-secret") !== syncSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { appId } = await params;
  const app = await db.asoApp.findUnique({ where: { id: appId } });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  // 最新レポート（スナップショットのみ）
  const report = await db.asoReport.findFirst({
    where: { appId, date: { not: { startsWith: "range:" } } },
    orderBy: { date: "desc" },
  });
  if (!report) return NextResponse.json({ error: "no report data" }, { status: 400 });

  // 承認待ち or バージョン待ちの提案
  const proposals = await db.proposal.findMany({
    where: {
      domain: "aso",
      targetId: appId,
      status: { in: ["pending", "approved"] },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  type ReportData = {
    periodFrom?: string;
    periodTo?: string;
    appMetrics?: {
      downloads: number | null;
      revenues: number | null;
      revenueCurrency: string;
      ratingsAvg: number | null;
      ratingsTotal: number | null;
      appPower: number | null;
    };
    keywords?: {
      keyword: string;
      rank: number | null;
      prevRank: number | null;
      volume: number | null;
      difficulty: number | null;
    }[];
  };

  const data = report.data as ReportData;
  const m = data.appMetrics;
  const kws = (data.keywords ?? []).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const period = data.periodFrom && data.periodTo && data.periodFrom !== data.periodTo
    ? `${data.periodFrom} 〜 ${data.periodTo}`
    : report.date;

  // キーワード順位
  const kwLines = kws.slice(0, 8).map((k) => {
    const rankStr = k.rank && k.rank < 500 ? `${k.rank}位` : "圏外";
    const diff = k.prevRank != null && k.rank != null && k.prevRank < 500 && k.rank < 500
      ? k.rank - k.prevRank : null;
    const arrow = diff == null ? "" : diff < 0 ? ` ↑${Math.abs(diff)}` : diff > 0 ? ` ↓${diff}` : " →";
    const strategy = (() => {
      const r = k.rank ?? 501;
      const v = k.volume ?? 0;
      const d = k.difficulty ?? 100;
      if (r <= 10)  return "✓守る";
      if (r <= 50)  return "↑伸ばす";
      if (r >= 500 && v >= 20 && d <= 65) return "🎯ねらう";
      if (d > 70)   return "激戦区";
      return "";
    })();
    return `  • ${k.keyword}: ${rankStr}${arrow}  ${strategy}  vol:${k.volume ?? "?"}`;
  }).join("\n");

  // 提案サマリー
  const proposalLines = proposals.map((p) => {
    let analysis: { nextAction?: string } | null = null;
    try { analysis = JSON.parse(p.rationale); } catch { /* noop */ }
    const status = p.status === "pending" ? "⏳承認待ち"
      : (p.result as { waitingForVersion?: boolean } | null)?.waitingForVersion
        ? "⏳バージョン待ち" : "✅承認済み";
    return `  ${status} *${p.title}*\n    ${analysis?.nextAction?.slice(0, 60) ?? p.summary.slice(0, 60)}…`;
  }).join("\n");

  const message = [
    `📊 *${app.name} ASO レポート* (${period})`,
    "",
    "*📱 アプリ指標*",
    m ? [
      `  DL数: ${m.downloads?.toLocaleString() ?? "—"}`,
      `  売上: $${m.revenues ?? "—"} ${m.revenueCurrency}`,
      `  評価: ${m.ratingsAvg?.toFixed(2) ?? "—"}（${m.ratingsTotal ?? "?"}件）`,
      `  App Power: ${m.appPower ?? "—"}/10`,
    ].join("\n") : "  データなし",
    "",
    "*🔍 キーワード順位*",
    kwLines || "  キーワード未登録",
    ...(proposalLines ? [
      "",
      "*💡 改善提案*",
      proposalLines,
    ] : []),
    "",
    `_詳細: https://agent-portal-production-ba67.up.railway.app/aso/${appId}_`,
  ].join("\n");

  const sent = await sendSlack(message);

  if (sent) {
    await db.asoReport.update({ where: { id: report.id }, data: { slackSent: true } });
    await writeAuditLog({
      action: "aso_report_slack",
      targetTable: "AsoReport",
      targetId: report.id,
      afterValue: { appId, date: report.date, proposalCount: proposals.length },
      req,
    });
  }

  return NextResponse.json({ sent, message });
}

