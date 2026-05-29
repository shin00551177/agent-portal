import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

const client = new Anthropic();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const { input, targetAge } = await req.json();
  if (!input?.trim()) return NextResponse.json({ error: "input is required" }, { status: 400 });

  // パターンをコンテキストとして注入
  const patterns = await db.snsPattern.findMany({
    where: { appId },
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  const patternContext = patterns.length > 0
    ? `\n## 蓄積済み成功パターン\n${patterns.map((p) => `- [${p.patternType}] ${p.title}`).join("\n")}`
    : "";

  const prompt = `あなたはSNSバズコンテンツの分析・制作専門家です。
Twomi（AIアバターと会話・ビデオ通話できるアプリ）のコンテンツ制作に活かすため、以下のバズ動画の文字起こし・説明文を分析してください。
${patternContext}

ターゲット年齢層: ${targetAge ?? "指定なし"}

## 入力コンテンツ
${input}

以下のJSON形式のみで返答してください:
{
  "why_viral": "なぜバズったかを2〜3文で",
  "pattern_type": "フック型・共感型・教育型など",
  "hook": "冒頭1〜3秒に何をしているか（具体的に）",
  "structure": "全体の構成を時系列で（例: 問題提起→解決策→証拠→CTA）",
  "target_insight": "視聴者の本音・悩み・動機を1文で",
  "materials_video": ["必要な映像素材1", "必要な映像素材2"],
  "materials_audio": "必要な音声の方向性",
  "materials_text": ["テロップ・キャプション1", "テロップ・キャプション2"],
  "materials_bgm": "BGMの方向性",
  "materials_editing": ["編集ポイント1", "編集ポイント2"],
  "scenario_hook": "Twomi版の冒頭フック（セリフ or テロップ）",
  "scenario_structure": [
    {"time": "0-3秒",  "scene": "シーン説明", "script": "セリフ or ナレーション"},
    {"time": "3-15秒", "scene": "シーン説明", "script": "セリフ or ナレーション"},
    {"time": "15-30秒","scene": "シーン説明", "script": "セリフ or ナレーション"},
    {"time": "30秒〜", "scene": "シーン説明", "script": "セリフ or ナレーション"}
  ],
  "scenario_cta": "CTA内容 + タイミング",
  "capcut_notes": "CapCutでの編集指示（カット数・テロップスタイル・エフェクト等）",
  "higgsfield_prompt": "Higgsfield AI用の英語動画生成プロンプト（具体的なシーン描写）"
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: "SNSコンテンツ制作の専門家として、指示されたJSON形式のみで返答してください。",
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  let result: Record<string, unknown> = {};
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) result = JSON.parse(m[0]);
  } catch {
    return NextResponse.json({ error: "AI応答のパースに失敗しました", raw: text }, { status: 500 });
  }

  return NextResponse.json(result);
}
