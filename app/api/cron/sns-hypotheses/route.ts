import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getAppContext } from "@/lib/snsAppContext";

const client = new Anthropic();

async function generateForApp(appId: string) {
  const appCtx = getAppContext(appId);
  const since14d = new Date(Date.now() - 14 * 86_400_000);

  const [freqRecs, pendingCount, recentHits, pastHypotheses, rejectedHypotheses, learnings, accounts] = await Promise.all([
    db.snsFrequencyRecommendation.findMany({ where: { appId } }),
    db.snsHypothesis.count({ where: { appId, status: "pending" } }),
    db.egoHit.findMany({ where: { appId, createdAt: { gte: since14d } }, orderBy: { score: "desc" }, take: 50 }),
    db.snsHypothesis.findMany({
      where: { appId, status: { in: ["approved", "briefed", "posted"] } },
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

  // 目標pending数 = 推奨週投稿数の合計（最低3、最大7）
  const targetPerWeek = freqRecs.reduce((sum, r) => sum + (r.adjustedFrequency ?? r.recommendedFrequency), 0);
  const targetPending = Math.min(Math.max(targetPerWeek, 3), 7);

  const needed = targetPending - pendingCount;
  if (needed <= 0) return { appId, generated: 0, reason: `already ${pendingCount} pending` };

  // 仮説生成プロンプト（hypotheses/generate/route.ts と同一ロジック）
  const hitsText = recentHits.slice(0, 20).map((h) =>
    `- [${h.sentiment ?? "不明"}/${h.source}] ${h.title}${h.snippet ? `（${h.snippet.slice(0, 80)}）` : ""}`
  ).join("\n") || "（直近14日間のエゴサデータなし）";

  const pastText = pastHypotheses.map((h) => `- [${h.platform}] ${h.hypothesis}（${h.status}）`).join("\n") || "（なし）";

  const avoidL    = learnings.filter((l) => l.type === "avoid");
  const prioritizeL = learnings.filter((l) => l.type === "prioritize");
  const generalL  = learnings.filter((l) => l.type === "general");
  const learningsText = learnings.length > 0
    ? [
        avoidL.length    > 0 && `【やってはいけない】\n${avoidL.map((l) => `- ${l.content}`).join("\n")}`,
        prioritizeL.length > 0 && `【優先すべき】\n${prioritizeL.map((l) => `- ${l.content}`).join("\n")}`,
        generalL.length  > 0 && `【一般原則】\n${generalL.map((l) => `- ${l.content}`).join("\n")}`,
      ].filter(Boolean).join("\n\n")
    : null;

  const rejectedText = learnings.length === 0 && rejectedHypotheses.length > 0
    ? rejectedHypotheses.map((h) =>
        `- [${h.platform}] ${h.hypothesis}\n  → 差し戻し理由: ${h.rejectionNote}`
      ).join("\n")
    : null;

  const platformList = freqRecs.length > 0
    ? freqRecs.map((r) => `${r.platform}（週${r.adjustedFrequency ?? r.recommendedFrequency}回推奨）`).join(", ")
    : (accounts.map((a) => a.platform).join(", ") || "x, instagram");

  const neg = recentHits.filter((h) => h.sentiment === "negative").length;
  const pos = recentHits.filter((h) => h.sentiment === "positive").length;
  const buzz = recentHits.filter((h) => h.category === "buzz").length;

  const langInstruction = appCtx.outputLang !== "日本語"
    ? `\n⚠️ IMPORTANT: All output must be in ${appCtx.outputLang}. Every field must be in ${appCtx.outputLang}.\n`
    : "";

  const prompt = `${langInstruction}あなたは${appCtx.name}のSNSストラテジストです。
${appCtx.description} ターゲット: ${appCtx.target}

## 直近14日間のエゴサ
- 収集${recentHits.length}件（ネガ${neg} / ポジ${pos} / バズ${buzz}）
${hitsText}

## 過去の承認済み仮説（参考）
${pastText}
${learningsText ? `\n## 📚 蓄積された学び（必ず遵守すること）\n${learningsText}` : ""}${rejectedText ? `\n## ❌ 差し戻し履歴（参考）\n${rejectedText}` : ""}
## 運用プラットフォーム
${platformList}

「今これを投稿すればバズる」仮説を${needed}件生成してください。
[
  {
    "platform": "プラットフォーム",
    "hypothesis": "バズる仮説（1〜2文）",
    "reasoning": "根拠（2〜4文）",
    "targetAudience": "ターゲット層",
    "format": "フォーマット",
    "contentBrief": "Content-lab向け指示書（箇条書き）"
  }
]
JSONのみ返してください。`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: "SNSストラテジストとして、データに基づく仮説をJSON形式のみで返してください。",
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";
  let items: Array<{ platform: string; hypothesis: string; reasoning: string; targetAudience?: string; format?: string; contentBrief?: string }> = [];
  try {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) items = JSON.parse(m[0]);
  } catch {
    return { appId, generated: 0, reason: "parse error" };
  }

  await Promise.all(
    items.slice(0, needed).map((item) =>
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

  return { appId, generated: items.length, targetPending, pendingBefore: pendingCount };
}

export async function POST(req: NextRequest) {
  // cronシークレット認証
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const activeApps = await db.snsApp.findMany({ where: { active: true } });
  const results = await Promise.all(activeApps.map((app) => generateForApp(app.id)));

  return NextResponse.json({ results, timestamp: new Date().toISOString() });
}
