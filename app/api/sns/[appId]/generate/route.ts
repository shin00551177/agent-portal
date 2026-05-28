import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

const client = new Anthropic();

const PLATFORM_TIPS: Record<string, string> = {
  youtube:   "YouTube Shortsの説明文・タイトル。60文字以内の引きのあるタイトルと、200文字程度の説明文。",
  instagram: "Instagramの投稿キャプション。絵文字を適度に使い、改行で読みやすく。ハッシュタグ多め（10〜20個）。",
  x:         "X（Twitter）の投稿。140文字以内。簡潔でインパクト重視。ハッシュタグは2〜3個。",
  facebook:  "Facebookの投稿。少し長めでもOK。親しみやすいトーン。ハッシュタグは3〜5個。",
  threads:   "Threadsの投稿。X寄りの短文。自然体なトーン。ハッシュタグは少なめ（3個以内）。",
  tiktok:    "TikTokの動画説明文。トレンド感あるキャッチーな文章。ハッシュタグ多め（15〜20個）。",
};

const GENRE_CONTEXT: Record<string, string> = {
  公式:     "Twomi公式アカウント。ブランドの信頼感・公式感を大切にしたトーン。",
  エンタメ: "エンタメ・バラエティ系アカウント。明るく楽しいトーン。",
  恋愛相談: "恋愛・人間関係テーマのアカウント。共感を呼ぶ温かいトーン。",
  雑談:     "日常会話・雑談系アカウント。カジュアルで親しみやすいトーン。",
  人生相談: "人生・悩み相談テーマのアカウント。寄り添う優しいトーン。",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const { platform, genre, language, count } = await req.json();

  const num = Math.min(10, Math.max(1, parseInt(count ?? "3", 10)));
  const lang = language === "en" ? "英語" : "日本語";
  const platformTip = PLATFORM_TIPS[platform] ?? "SNS投稿文。";
  const genreCtx = GENRE_CONTEXT[genre] ?? "";

    // Confidence assessment: high if platform+genre are well-defined, medium otherwise
  const confidenceLevel =
    PLATFORM_TIPS[platform] && GENRE_CONTEXT[genre] ? "high" : "medium";

const prompt = `あなたはTwomiのSNSコンテンツ担当です。

【Twomiについて】
Twomiは「AIアバターと自由に会話・ビデオ通話できるアプリ」です。
AIキャラクターとのリアルタイム会話、アバター作成、ライブ配信機能を持ちます。
ターゲット: 10〜30代のSNSユーザー。

【生成条件】
- プラットフォーム: ${platform}（${platformTip}）
- ジャンル: ${genre}（${genreCtx}）
- 言語: ${lang}
- 件数: ${num}件

以下のJSON配列形式で${num}件の投稿案を生成してください。コードブロックや説明文は不要、JSONのみ返してください。

[
  {
    "copy": "投稿本文",
    "hashtags": ["タグ1", "タグ2"],
    "imagePrompt": "画像・サムネイルのイメージ説明（任意）",
    "notes": "投稿時の補足メモ（任意）"
  }
]`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "JSON parse failed", raw: text }, { status: 500 });
    }

    const items: { copy: string; hashtags: string[]; imagePrompt?: string; notes?: string }[] =
      JSON.parse(jsonMatch[0]);

    const drafts = await Promise.all(
      items.map((item) =>
        db.snsDraft.create({
          data: {
            appId,
            platform,
            copy: item.copy,
            hashtags: item.hashtags ?? [],
            imagePrompt: item.imagePrompt ?? null,
            notes: item.notes ?? null,
            status: "pending",
            confidence: confidenceLevel,
            dataFreshness: new Date(),
          },
        })
      )
    );

    return NextResponse.json({ drafts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
