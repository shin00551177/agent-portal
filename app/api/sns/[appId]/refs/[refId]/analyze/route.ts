import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

const client = new Anthropic();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string; refId: string }> }
) {
  const { refId } = await params;

  const ref = await db.snsRefVideo.findUnique({ where: { id: refId } });
  if (!ref) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prompt = `以下のSNS動画情報を分析し、Twomi（AIアバターと会話・ビデオ通話できるアプリ）のコンテンツ制作に活かせる知見をJSONで返してください。

## 動画情報
- URL: ${ref.url}
- プラットフォーム: ${ref.platform}
- アカウント: ${ref.account ?? "不明"}
- タイトル: ${ref.title ?? "不明"}
- 再生数: ${ref.views?.toLocaleString() ?? "不明"}
- いいね数: ${ref.likes?.toLocaleString() ?? "不明"}
- コメント数: ${ref.comments?.toLocaleString() ?? "不明"}
- シェア数: ${ref.shares?.toLocaleString() ?? "不明"}
- 動画時間: ${ref.duration ? `${ref.duration}秒` : "不明"}
- 投稿日: ${ref.postedDate ?? "不明"}
- ハッシュタグ: ${ref.hashtags ?? "不明"}
- BGM: ${ref.bgm ?? "不明"}

以下のJSONキーで返してください（値は日本語）:
{
  "targetAge": "ターゲット年齢層（例: 20代女性、10〜20代全般）",
  "category": "コンテンツカテゴリ（例: エンタメ、恋愛、日常、AI・テクノロジー）",
  "creatorType": "クリエイタータイプ（例: 個人、企業公式、インフルエンサー）",
  "visualType": "映像スタイル（例: 顔出し、テキスト主体、アニメーション、画面録画）",
  "tempo": "テンポ感（例: 高速カット、ゆっくり、標準）",
  "hook": "冒頭3秒のフック手法（具体的に）",
  "structure": "動画全体の構成（例: 問題提起→解決→CTA）",
  "ctaContent": "CTA内容（例: フォロー誘導、コメント促進、URL誘導）",
  "ctaTiming": "CTAのタイミング（例: 最後5秒、中盤）",
  "whyBuzz": "バズった主な理由（2〜3文）",
  "credibility": "信頼性・権威性の演出方法",
  "peakMoment": "最も注目を集めるシーン・瞬間",
  "twomiIdea": "Twomiコンテンツへの応用アイデア（具体的に）",
  "twomiScript": "Twomi向けに応用した場合の投稿文案（1〜2文）",
  "aiComment": "この動画のバズり度・使えど・熱量コメント（1〜2文）"
}

JSONのみ返してください。`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: "SNSコンテンツマーケティングの専門家として、指示されたJSON形式のみで返答してください。",
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  let data: Record<string, string> = {};
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) data = JSON.parse(m[0]);
  } catch {
    return NextResponse.json({ error: "AI応答のパースに失敗しました" }, { status: 500 });
  }

  const updated = await db.snsRefVideo.update({
    where: { id: refId },
    data: {
      analyzed: true,
      targetAge: data.targetAge ?? null,
      category: data.category ?? null,
      creatorType: data.creatorType ?? null,
      visualType: data.visualType ?? null,
      tempo: data.tempo ?? null,
      hook: data.hook ?? null,
      structure: data.structure ?? null,
      ctaContent: data.ctaContent ?? null,
      ctaTiming: data.ctaTiming ?? null,
      whyBuzz: data.whyBuzz ?? null,
      credibility: data.credibility ?? null,
      peakMoment: data.peakMoment ?? null,
      twomiIdea: data.twomiIdea ?? null,
      twomiScript: data.twomiScript ?? null,
      aiComment: data.aiComment ?? null,
    },
  });

  return NextResponse.json(updated);
}
