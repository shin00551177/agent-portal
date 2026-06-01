import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getAppContext } from "@/lib/snsAppContext";

const client = new Anthropic();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
  const { appId } = await params;
  const appCtx = getAppContext(appId);

  const since14d = new Date(Date.now() - 14 * 86_400_000);

  const [recentHits, pastHypotheses, rejectedHypotheses, learnings, accounts] = await Promise.all([
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
    db.snsHypothesis.findMany({
      where: { appId, status: "rejected", rejectionNote: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.snsLearning.findMany({ where: { appId, active: true }, orderBy: { type: "asc" } }),
    db.snsAccount.findMany({ where: { appId } }),
  ]);

  const hitsText = recentHits.length > 0
    ? recentHits.slice(0, 20).map((h) =>
        `- [${h.sentiment ?? "不明"}/${h.source}] ${h.title}${h.snippet ? `（${h.snippet.slice(0, 80)}）` : ""}`
      ).join("\n")
    : "（直近14日間のエゴサデータなし）";

  const pastText = pastHypotheses.length > 0
    ? pastHypotheses.map((h) => `- [${h.platform}] ${h.hypothesis}（${h.status}）`).join("\n")
    : "（過去の承認済み仮説なし）";

  // 蒸留済み学びDB（優先）+ 生の差し戻し（補完）
  const avoidLearnings    = learnings.filter((l) => l.type === "avoid");
  const prioritizeLearnings = learnings.filter((l) => l.type === "prioritize");
  const generalLearnings  = learnings.filter((l) => l.type === "general");

  const learningsText = learnings.length > 0
    ? [
        avoidLearnings.length    > 0 && `【やってはいけない】\n${avoidLearnings.map((l) => `- ${l.content}${l.platform ? `（${l.platform}）` : ""}`).join("\n")}`,
        prioritizeLearnings.length > 0 && `【優先すべき】\n${prioritizeLearnings.map((l) => `- ${l.content}${l.platform ? `（${l.platform}）` : ""}`).join("\n")}`,
        generalLearnings.length  > 0 && `【一般原則】\n${generalLearnings.map((l) => `- ${l.content}${l.platform ? `（${l.platform}）` : ""}`).join("\n")}`,
      ].filter(Boolean).join("\n\n")
    : null;

  // 学びDBにない場合のみ生データの差し戻しを補完
  const rejectedText = learnings.length === 0 && rejectedHypotheses.length > 0
    ? rejectedHypotheses.map((h) =>
        `- [${h.platform}] ${h.hypothesis}\n  → 差し戻し理由: ${h.rejectionNote}`
      ).join("\n")
    : null;

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

## 過去の承認済み仮説（参考: 何がOKだったか）
${pastText}
${learningsText ? `\n## 📚 蓄積された学び（必ず遵守すること）\n${learningsText}` : ""}${rejectedText ? `\n## ❌ 差し戻し履歴（参考）\n${rejectedText}` : ""}
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

  let message;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: "SNSストラテジストとして、データに基づく戦略的な投稿仮説をJSON形式のみで返してください。",
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Claude API error: ${msg}` }, { status: 500 });
  }

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
    if (m) {
      const parsed = JSON.parse(m[0]);
      // contentBriefが配列で返ってきた場合に文字列に変換
      items = parsed.map((item: Record<string, unknown>) => ({
        ...item,
        contentBrief: Array.isArray(item.contentBrief)
          ? (item.contentBrief as string[]).join("\n")
          : (item.contentBrief ?? null),
      }));
    }
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
          contentBrief: Array.isArray(item.contentBrief)
            ? item.contentBrief.join("\n")
            : (item.contentBrief ?? null),
          status: "pending",
        },
      })
    )
  );

  return NextResponse.json({ hypotheses: saved });
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
