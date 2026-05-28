import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

const client = new Anthropic();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  const { question } = await req.json() as { question: string };
  if (!question?.trim()) return NextResponse.json({ error: "question required" }, { status: 400 });

  const app = await db.asoApp.findUnique({ where: { id: appId } });
  const report = await db.asoReport.findFirst({
    where: { appId, date: { not: { startsWith: "range:" } } },
    orderBy: { date: "desc" },
  });
  if (!report) return NextResponse.json({ error: "no data" }, { status: 400 });

  type ReportData = {
    appMetrics?: {
      downloads: number | null; revenues: number | null; revenueCurrency: string;
      ratingsAvg: number | null; ratingsTotal: number | null; appPower: number | null;
    };
    keywords?: { keyword: string; rank: number | null; volume: number | null; difficulty: number | null }[];
    periodFrom?: string; periodTo?: string;
  };

  const data = report.data as ReportData;
  const m = data.appMetrics;
  const kws = (data.keywords ?? []).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  const context = `
アプリ: ${app?.name ?? appId}
集計期間: ${data.periodFrom ?? report.date} 〜 ${data.periodTo ?? report.date}

【アプリ指標】
- DL数: ${m?.downloads ?? "不明"}
- 売上: $${m?.revenues ?? "不明"} ${m?.revenueCurrency ?? "USD"}
- 評価: ${m?.ratingsAvg ?? "不明"}（${m?.ratingsTotal ?? "不明"}件）
- App Power: ${m?.appPower ?? "不明"}/10

【キーワード順位】
${kws.map((k) => `- ${k.keyword}: ${k.rank && k.rank < 500 ? `${k.rank}位` : "圏外"} | vol:${k.volume ?? "?"} diff:${k.difficulty ?? "?"}`).join("\n")}
`.trim();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `あなたはApp Store最適化（ASO）の専門家です。
以下のTwomiアプリのASOデータをもとに、ユーザーの質問に端的に答えてください。
データに基づいた具体的な回答を心がけ、推測の場合はその旨を明示してください。
日本語で答え、200文字〜400文字程度を目安にしてください。

${context}`,
    messages: [{ role: "user", content: question }],
  });

  const answer = message.content[0].type === "text" ? message.content[0].text : "";
  return NextResponse.json({ answer });
}
