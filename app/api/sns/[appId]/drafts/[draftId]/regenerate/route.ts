import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { generateImage } from "@/lib/imageGen";

const client = new Anthropic();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string; draftId: string }> }
) {
  const { appId, draftId } = await params;
  const { improvementNotes } = await req.json() as { improvementNotes: string };

  if (!improvementNotes?.trim()) {
    return NextResponse.json({ error: "improvementNotes required" }, { status: 400 });
  }

  // Get the original draft
  const original = await db.snsDraft.findUnique({ where: { id: draftId } });
  if (!original || original.appId !== appId) {
    return NextResponse.json({ error: "draft not found" }, { status: 404 });
  }

  // Mark original as rejected
  await db.snsDraft.update({ where: { id: draftId }, data: { status: "rejected" } });

  const prompt = `あなたはTwomiのSNSコンテンツ担当です。
以下の投稿案を改善指示に基づいて書き直してください。

【プラットフォーム】
${original.platform}

【元の投稿案】
${original.copy}

【改善指示】
${improvementNotes}

改善した投稿案を以下のJSON形式で1件だけ返してください。コードブロックや説明文は不要、JSONのみ。

[
  {
    "copy": "改善後の投稿本文",
    "hashtags": ["タグ1", "タグ2"],
    "imagePrompt": "DALL-E用の英語画像説明。シーン・雰囲気・構図を具体的に。",
    "notes": "改善のポイント（任意）"
  }
]`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "parse failed", raw: text }, { status: 500 });
    }

    const [item] = JSON.parse(jsonMatch[0]) as {
      copy: string; hashtags: string[]; imagePrompt?: string; notes?: string;
    }[];

    // Save new draft
    const newDraft = await db.snsDraft.create({
      data: {
        appId,
        platform: original.platform,
        copy: item.copy,
        hashtags: item.hashtags ?? [],
        imagePrompt: item.imagePrompt ?? null,
        imageStatus: item.imagePrompt ? "generating" : null,
        notes: item.notes ?? `改善指示: ${improvementNotes}`,
        status: "pending",
        confidence: "high",
        dataFreshness: new Date(),
      },
    });

    // Generate image in parallel
    if (newDraft.imagePrompt) {
      const result = await generateImage(newDraft.imagePrompt, newDraft.platform);
      await db.snsDraft.update({
        where: { id: newDraft.id },
        data: "url" in result
          ? { imageUrl: result.url, imageStatus: "done" }
          : { imageStatus: "error" },
      });
    }

    const updated = await db.snsDraft.findUnique({ where: { id: newDraft.id } });
    return NextResponse.json({ draft: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
