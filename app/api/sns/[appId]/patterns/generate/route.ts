import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

const client = new Anthropic();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;

  const refs = await db.snsRefVideo.findMany({
    where: { appId, analyzed: true },
    orderBy: { views: "desc" },
  });

  if (refs.length === 0) {
    return NextResponse.json(
      { error: "分析済みのレファランス動画が0件です。まず動画を追加・分析してください。" },
      { status: 400 }
    );
  }

  const videoSummaries = refs
    .map(
      (v, i) =>
        `## 動画 ${i + 1}: ${v.account ?? "不明"} [${v.platform}] (${v.views?.toLocaleString() ?? 0}再生)
- カテゴリ: ${v.category ?? "-"}
- ターゲット: ${v.targetAge ?? "-"}
- フック: ${v.hook ?? "-"}
- 構成: ${v.structure ?? "-"}
- バズった理由: ${v.whyBuzz ?? "-"}
- CTA: ${v.ctaContent ?? "-"}
- ピークモーメント: ${v.peakMoment ?? "-"}
- Twomi応用アイデア: ${v.twomiIdea ?? "-"}`
    )
    .join("\n\n");

  const prompt = `あなたはTwomi（AIアバターと会話・ビデオ通話できるアプリ）のSNSコンテンツ専門家です。
以下の${refs.length}件のバズ動画分析データから、Twomiのコンテンツに活かせる成功パターンを抽出してください。

${videoSummaries}

## 出力形式（必ずJSON配列で返答）

以下のカテゴリから各2〜4パターンを抽出してください:
- フック型: 視聴者を掴む冒頭の手法
- 構成型: 動画・投稿全体の流れのパターン
- CTA型: 行動を促す効果的な手法
- BGM型: 音楽・テンポの活用パターン
- 映像型: 映像・ビジュアル表現のパターン

[
  {
    "title": "パターン名（簡潔に）",
    "platform": "TikTok",
    "targetAge": "20代女性",
    "patternType": "フック型",
    "description": "このパターンの詳細説明（なぜ効果的か、Twomiでどう使うか）",
    "exampleHooks": ["Twomi向けフック例1", "Twomi向けフック例2", "Twomi向けフック例3"]
  }
]

JSONのみ返してください。`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: "SNSコンテンツマーケティング専門家として、指示されたJSON形式のみで返答してください。",
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";
  let patterns: Array<{
    title: string;
    platform?: string;
    targetAge?: string;
    patternType?: string;
    description?: string;
    exampleHooks?: string[];
  }> = [];

  try {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) patterns = JSON.parse(m[0]);
  } catch {
    return NextResponse.json({ error: "AI応答のパースに失敗しました" }, { status: 500 });
  }

  if (!Array.isArray(patterns) || patterns.length === 0) {
    return NextResponse.json({ error: "パターンが生成されませんでした" }, { status: 500 });
  }

  // 既存パターンを削除して置き換え
  await db.snsPattern.deleteMany({ where: { appId } });
  const saved = await db.snsPattern.createMany({
    data: patterns.map((p) => ({
      appId,
      title: p.title ?? "パターン",
      platform: p.platform ?? null,
      targetAge: p.targetAge ?? null,
      patternType: p.patternType ?? "フック型",
      description: p.description ?? "",
      exampleHooks: p.exampleHooks ?? [],
    })),
  });

  const result = await db.snsPattern.findMany({
    where: { appId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ patterns: result, count: saved.count });
}
