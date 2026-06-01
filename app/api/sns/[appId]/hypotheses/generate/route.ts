import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getAppContext } from "@/lib/snsAppContext";

const client = new Anthropic();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const appCtx = getAppContext(appId);

  const since14d = new Date(Date.now() - 14 * 86_400_000);

  const [recentHits, pastHypotheses, accounts] = await Promise.all([
    db.egoHit.findMany({
      where: { appId, createdAt: { gte: since14d } },
      orderBy: { score: "desc" },
      take: 50,
    }),
    db.snsHypothesis.findMany({
      where: { appId, status: { in: ["approved", "briefed", "posted", "measured"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.snsAccount.findMany({ where: { appId } }),
  ]);

  const hitsText = recentHits.length > 0
    ? recentHits.slice(0, 20).map((h) =>
        `- [${h.sentiment ?? "不明"}/${h.source}] ${h.title}${h.snippet ? `（${h.snippet.slice(0, 80)}）` : ""}`
      ).join("\n")
    : "（直近14日間のエゴサデータなし）";

  const pastText = pastHypotheses.length > 0
    ? pastHypotheses.map((h) =>
        `- [${h.platform}] ${h.hypothesis}（${h.status}）`
      ).join("\n")
    : "（過去の承認済み仮説なし）";

  const platformList = accounts.length > 0
    ? [...new Set(accounts.map((a) => a.platform))].join(", ")
    : (appCtx.platforms ?? ["x", "instagram", "tiktok"]).join(", ");

  const negCount = recentHits.filter((h) => h.sentiment === "negative").length;
  const posCount = recentHits.filter((h) => h.sentiment === "positive").length;
  const buzzCount = recentHits.filter((h) => h.category === "buzz").length;

  const prompt = `あなたは${appCtx.name}のSNSストラテジストです。
${appCtx.description}
ターゲット: ${appCtx.target}

## 直近14日間のエゴサ概要
- 収集件数: ${recentHits.length}件（ネガ${negCount}件 / ポジ${posCount}件 / バズ${buzzCount}件）
- 主な言及:
${hitsText}

## 過去の承認済み仮説
${pastText}

## 運用プラットフォーム
${platformList}

---

上記のデータを分析し、「今これを投稿すればバズる」という仮説を3件生成してください。
各仮説は根拠のある戦略的な仮説であり、実際のコンテンツ制作はContent-labに委託します。

以下のJSON配列形式で返してください:
[
  {
    "platform": "投稿プラットフォーム（例: instagram）",
    "hypothesis": "バズる仮説（1〜2文。何を・どんなトーンで・なぜ今投稿するかを凝縮）",
    "reasoning": "根拠（エゴサデータ・過去分析・トレンドを具体的に引用して2〜4文）",
    "targetAudience": "ターゲット層（例: 20代女性・深夜利用者）",
    "format": "フォーマット（例: 縦動画・共感型ストーリー）",
    "contentBrief": "Content-labへの指示書（制作上のポイント・トーン・フック・CTAを箇条書きで）"
  }
]

JSONのみ返してください。`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: "SNSストラテジストとして、データに基づく戦略的な投稿仮説をJSON形式のみで返してください。",
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";
  let items: Array<{
    platform: string;
    hypothesis: string;
    reasoning: string;
    targetAudience?: string;
    format?: string;
    contentBrief?: string;
  }> = [];

  try {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) items = JSON.parse(m[0]);
  } catch {
    return NextResponse.json({ error: "AI応答のパースに失敗しました" }, { status: 500 });
  }

  const saved = await Promise.all(
    items.map((item) =>
      db.snsHypothesis.create({
        data: {
          appId,
          platform: item.platform,
          hypothesis: item.hypothesis,
          reasoning: item.reasoning,
          targetAudience: item.targetAudience ?? null,
          format: item.format ?? null,
          contentBrief: item.contentBrief ?? null,
          status: "pending",
        },
      })
    )
  );

  return NextResponse.json({ hypotheses: saved });
}
