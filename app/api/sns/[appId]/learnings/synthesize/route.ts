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

  const [rejected, existingLearnings] = await Promise.all([
    db.snsHypothesis.findMany({
      where: { appId, status: "rejected", rejectionNote: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.snsLearning.findMany({ where: { appId, active: true } }),
  ]);

  if (rejected.length === 0) {
    return NextResponse.json({ error: "差し戻し履歴がありません" }, { status: 400 });
  }

  const rejectedText = rejected.map((h) =>
    `- [${h.platform}] 仮説: ${h.hypothesis}\n  理由: ${h.rejectionNote}`
  ).join("\n");

  const existingText = existingLearnings.length > 0
    ? `既存の学び（重複を避けること）:\n${existingLearnings.map((l) => `- [${l.type}] ${l.content}`).join("\n")}`
    : "";

  const prompt = `あなたは${appCtx.name}のSNS運用アナリストです。

以下の差し戻された仮説とその理由を分析し、
今後の仮説生成に活かせる「学び」を抽出してください。

## 差し戻し履歴
${rejectedText}

${existingText}

以下のJSON配列で返してください（3〜7件）:
[
  {
    "type": "avoid" | "prioritize" | "general",
    "content": "学びの内容（1〜2文、具体的かつ原則として使えるもの）",
    "platform": null | "プラットフォーム名"
  }
]

- "avoid": やってはいけないパターン
- "prioritize": 優先すべきアプローチ
- "general": 全般的な原則

JSONのみ返してください。`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: "SNS運用の学習を抽出するアナリストとして、JSON形式のみで返してください。",
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";
  let items: Array<{ type: string; content: string; platform?: string | null }> = [];
  try {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) items = JSON.parse(m[0]);
  } catch {
    return NextResponse.json({ error: "AI応答のパースに失敗しました" }, { status: 500 });
  }

  const saved = await Promise.all(
    items.map((item) =>
      db.snsLearning.create({
        data: {
          appId,
          type: item.type,
          content: item.content,
          platform: item.platform ?? null,
          source: "ai_synthesis",
        },
      })
    )
  );

  return NextResponse.json({ learnings: saved, count: saved.length });
}
