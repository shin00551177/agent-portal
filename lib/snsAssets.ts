// SNS投稿アセット自動生成パイプライン
// 仮説が承認されたら: Imagen画像生成 → JPEG変換+GCSホスト → Haikuキャプション生成 → metricsに保存
// 人間の役割は「承認」と「投稿Go」のみ（principle_improvement_loop）

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { generateImage } from "@/lib/imageGen";
import { hostImageAsJpeg } from "@/lib/mediaStore";

const claude = new Anthropic();

/**
 * Generate image + caption for an approved hypothesis and store in metrics.
 * Single attempt, fail-soft: errors are recorded in metrics.assetError (no retry loop).
 */
export async function generatePostAssets(hypothesisId: string): Promise<void> {
  const h = await db.snsHypothesis.findUnique({ where: { id: hypothesisId } });
  if (!h) return;

  const existing = (h.metrics as Record<string, unknown> | null) ?? {};

  try {
    // 1. 画像生成（Imagen 3、プラットフォーム別アスペクト比）
    const imagePrompt = [
      h.format ? `Format: ${h.format}.` : "",
      h.contentBrief ?? h.hypothesis,
      "High quality, social media ready, no text overlay, no watermark.",
    ].filter(Boolean).join(" ");

    const img = await generateImage(imagePrompt, h.platform);
    if ("error" in img) throw new Error(`imageGen: ${img.error}`);

    // 2. JPEG変換 + GCSホスト（IG要件: 直接JPEG URL）
    const imageUrl = await hostImageAsJpeg(img.url, `${h.appId}/${h.platform}`);

    // 3. キャプション生成（Haiku、低コスト・1回のみ）
    const msg = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: "You are an SNS copywriter. Output ONLY the post caption text. No explanations, no quotes.",
      messages: [{
        role: "user",
        content: `以下の仮説に基づく${h.platform}投稿のキャプションを日本語で書いてください。ハッシュタグ3〜5個を末尾に含める。仮説: ${h.hypothesis}\nターゲット: ${h.targetAudience ?? "一般"}\n指示: ${h.contentBrief ?? "なし"}`,
      }],
    });
    const caption = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

    // 4. metricsに保存（承認済みステータスは変えない — 投稿Goは人間）
    await db.snsHypothesis.update({
      where: { id: hypothesisId },
      data: {
        metrics: {
          ...existing,
          generatedImageUrl: imageUrl,
          generatedCaption: caption,
          assetsReadyAt: new Date().toISOString(),
          assetError: null,
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[snsAssets] generation failed for ${hypothesisId}:`, msg);
    await db.snsHypothesis.update({
      where: { id: hypothesisId },
      data: { metrics: { ...existing, assetError: msg, assetErrorAt: new Date().toISOString() } },
    }).catch(() => null);
  }
}
