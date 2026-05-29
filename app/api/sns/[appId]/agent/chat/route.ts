import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

const client = new Anthropic();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const { messages } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  // RAGコンテキスト収集
  const [patterns, topRefs, recentEgoHits] = await Promise.all([
    db.snsPattern.findMany({ where: { appId }, take: 8, orderBy: { createdAt: "desc" } }),
    db.snsRefVideo.findMany({ where: { appId, analyzed: true }, take: 5, orderBy: { views: "desc" } }),
    db.egoHit.findMany({
      where: { appId, dismissed: false },
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const patternCtx = patterns.length > 0
    ? `## 蓄積済み成功パターン\n${patterns.map((p) => `- [${p.patternType}] ${p.title}: ${p.description}`).join("\n")}`
    : "";

  const refCtx = topRefs.length > 0
    ? `## バズ実績のある参考動画\n${topRefs.map((r) =>
        `- ${r.platform} @${r.account ?? "不明"} (${r.views?.toLocaleString() ?? 0}再生)\n  フック: ${r.hook ?? "不明"} / Twomiアイデア: ${r.twomiIdea ?? "不明"}`
      ).join("\n")}`
    : "";

  const egoCtx = recentEgoHits.length > 0
    ? `## 直近のSNS言及（エゴサ結果）\n${recentEgoHits.map((h) =>
        `- [${h.sentiment ?? "不明"}] ${h.title} (${h.source})`
      ).join("\n")}`
    : "";

  const systemPrompt = `あなたはTwomi（AIアバターと自由に会話・ビデオ通話できるアプリ）専属のSNSコンテンツAIです。
10〜30代のSNSユーザーへのリーチを最大化するコンテンツ制作を支援します。

## できること
- TikTok / Instagram / YouTube Shorts の台本・シナリオ生成
- 投稿キャプション・ハッシュタグ生成
- バズ動画の分析・成功パターン解説
- コンテンツ戦略・投稿スケジュール立案
- Higgsfield AI / DALL-E 向け画像・動画プロンプト生成
- エゴサ（SNS言及）への対応策提案

## 回答スタイル
- 成果物（台本・キャプション等）はコピペできる形で出す
- 蓄積されたパターン・参考動画データを積極的に参照して根拠をつける
- 回答の最後に「次にできること」を2〜3個提案する

${patternCtx}

${refCtx}

${egoCtx}`;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
