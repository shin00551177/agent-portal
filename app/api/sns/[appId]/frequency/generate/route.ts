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

  const since30d = new Date(Date.now() - 30 * 86_400_000);
  const [accounts, recentHits, postedHypotheses, existingRecs] = await Promise.all([
    db.snsAccount.findMany({ where: { appId } }),
    db.egoHit.findMany({ where: { appId, createdAt: { gte: since30d } }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.snsHypothesis.findMany({ where: { appId, status: { in: ["posted", "measured"] } }, orderBy: { postedAt: "desc" }, take: 20 }),
    db.snsFrequencyRecommendation.findMany({ where: { appId } }),
  ]);

  const platformsWithAccounts = [...new Set(accounts.map((a) => a.platform))];
  const platforms = platformsWithAccounts.length > 0 ? platformsWithAccounts : (appCtx.platforms ?? ["x", "instagram"]);

  // 時間帯別エゴサ分布
  const hourDistribution = recentHits.reduce((acc, h) => {
    const hour = new Date(h.createdAt).getHours();
    acc[hour] = (acc[hour] ?? 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  const peakHours = Object.entries(hourDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([h]) => `${h}時台`);

  const currentRecs = existingRecs.map((r) =>
    `${r.platform}: 現在${r.currentFrequency ?? "不明"}回/週、推奨${r.recommendedFrequency}回/週`
  ).join("\n");

  const prompt = `あなたは${appCtx.name}のSNS運用ストラテジストです。
${appCtx.description}

## 運用アカウント
${platforms.join(", ")}

## 直近30日のエゴサ概要
- 収集件数: ${recentHits.length}件
- エンゲージメントピーク時間帯: ${peakHours.join(", ")}
- 投稿実績: ${postedHypotheses.length}件

## 現在の頻度設定
${currentRecs || "未設定"}

各プラットフォームの最適な投稿頻度を分析してJSON配列で返してください:
[
  {
    "platform": "プラットフォーム名",
    "currentFrequency": 現在の週投稿数（不明なら null）,
    "recommendedFrequency": 推奨週投稿数（整数）,
    "reasoning": "推奨理由（データに基づいて2〜3文）"
  }
]

JSONのみ返してください。`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: "SNS運用の専門家として、データに基づく投稿頻度レコメンドをJSON形式のみで返してください。",
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";
  let items: Array<{ platform: string; currentFrequency: number | null; recommendedFrequency: number; reasoning: string }> = [];
  try {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) items = JSON.parse(m[0]);
  } catch {
    return NextResponse.json({ error: "AI応答のパースに失敗しました" }, { status: 500 });
  }

  const saved = await Promise.all(
    items.map((item) =>
      db.snsFrequencyRecommendation.upsert({
        where: { appId_platform: { appId, platform: item.platform } },
        update: {
          recommendedFrequency: item.recommendedFrequency,
          reasoning: item.reasoning,
          ...(item.currentFrequency !== null && { currentFrequency: item.currentFrequency }),
        },
        create: {
          appId,
          platform: item.platform,
          currentFrequency: item.currentFrequency ?? null,
          recommendedFrequency: item.recommendedFrequency,
          reasoning: item.reasoning,
        },
      })
    )
  );

  return NextResponse.json({ recommendations: saved });
}
