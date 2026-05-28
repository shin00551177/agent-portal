import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const client = new Anthropic();

type KwData = {
  keyword: string;
  rank: number | null;
  prevRank: number | null;
  volume: number | null;
  difficulty: number | null;
};

type AppMetrics = {
  downloads: number | null;
  revenues: number | null;
  revenueCurrency: string;
  ratingsAvg: number | null;
  ratingsTotal?: number | null;
  appPower: number | null;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appId } = await params;

  const app = await db.asoApp.findUnique({ where: { id: appId } });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  const report = await db.asoReport.findFirst({
    where: { appId },
    orderBy: { date: "desc" },
  });
  if (!report) return NextResponse.json({ error: "no report data" }, { status: 400 });

  const data = report.data as { keywords?: KwData[]; appMetrics?: AppMetrics };
  const keywords = data.keywords ?? [];
  const metrics = data.appMetrics;

  const kwSummary = keywords
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((k) => {
      const rankStr = k.rank && k.rank < 500 ? `${k.rank}位` : "圏外";
      const trend = k.prevRank != null && k.rank != null && k.rank < 500 && k.prevRank < 500
        ? (k.rank < k.prevRank ? `↑${k.prevRank - k.rank}` : k.rank > k.prevRank ? `↓${k.rank - k.prevRank}` : "→")
        : "";
      return `  - ${k.keyword}: ${rankStr}${trend} | vol:${k.volume ?? "?"} diff:${k.difficulty ?? "?"}`;
    })
    .join("\n");

  const prompt = `あなたはApp Store最適化（ASO）の専門家です。以下の ${app.name} のASO データを分析し、売上向上に直結する改善提案を3件生成してください。

## アプリ指標（${report.date}）
- DL数: ${metrics?.downloads ?? "?"}
- 売上: $${metrics?.revenues ?? "?"} ${metrics?.revenueCurrency ?? "USD"}
- 評価: ${metrics?.ratingsAvg ?? "?"}（${metrics?.ratingsTotal ?? "?"}件）
- App Power: ${metrics?.appPower ?? "?"}/10

## キーワード順位
${kwSummary}

## 分析指針
- App Power 0.9/10 は非常に低い → 検索露出が極めて弱い
- 「圏外」かつ volume が高く difficulty が低いキーワードは最大の機会
- タイトル/サブタイトルにキーワードを含めるとランクが大幅改善しやすい
- iOS では「キーワードフィールド」（100文字）が重要だが、空白・カンマの使い方がポイント

以下のJSON配列形式で3件の提案を返してください。コードブロックや説明文は不要、JSONのみ返してください。

[
  {
    "title": "提案タイトル（20文字以内）",
    "summary": "1〜2文の要約（画面表示用）",
    "rationale": "根拠となる分析（なぜこの変更が効くか、期待される効果を含む。200文字程度）",
    "field": "title" | "subtitle" | "keywords" | "description",
    "current": "現在の値（不明な場合は空文字）",
    "proposed": "変更後の値の提案",
    "expectedImpact": "期待される効果（例: 「アバター」で圏外→top50入り見込み）"
  }
]`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "parse failed", raw: text }, { status: 500 });
  }

  type ProposalInput = {
    title: string;
    summary: string;
    rationale: string;
    field: string;
    current: string;
    proposed: string;
    expectedImpact: string;
  };

  const proposals: ProposalInput[] = JSON.parse(jsonMatch[0]);

  // 既存の pending 提案を古いものとして reject（重複防止）
  await db.proposal.updateMany({
    where: { domain: "aso", targetId: appId, status: "pending" },
    data: { status: "rejected", decision: "no", decidedAt: new Date() },
  });

  const created = await Promise.all(
    proposals.map((p) =>
      db.proposal.create({
        data: {
          domain: "aso",
          targetType: "aso_app",
          targetId: appId,
          title: p.title,
          summary: p.summary,
          rationale: `${p.rationale}\n\n**対象フィールド**: ${p.field}\n**現在**: ${p.current || "（未取得）"}\n**提案**: ${p.proposed}\n**期待効果**: ${p.expectedImpact}`,
          decisionType: "yesno",
          actionType: "manual",
          actionPayload: { field: p.field, current: p.current, proposed: p.proposed },
          confidence: "medium",
        },
      })
    )
  );

  await writeAuditLog({
    action: "aso_analyze",
    targetTable: "Proposal",
    targetId: appId,
    afterValue: { proposalsCreated: created.length },
    req,
  });

  return NextResponse.json({ proposalIds: created.map((p) => p.id) });
}
