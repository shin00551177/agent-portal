import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fetchIosReviews, replyToReview } from "@/lib/asc";
import { fetchPlayReviews, replyToPlayReview } from "@/lib/gplay";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// ─── GET: レビュー一覧取得 ────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { appId } = await params;
  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get("refresh") === "1";
  const platform = searchParams.get("platform") ?? "all";
  const ratingFilter = searchParams.get("rating") ? parseInt(searchParams.get("rating")!) : null;

  const app = await db.asoApp.findUnique({ where: { id: appId } });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  // refresh=1 の場合はAPIから再取得してDBに保存
  if (refresh) {
    const [iosReviews, androidReviews] = await Promise.all([
      (platform === "all" || platform === "ios") && app.iosId
        ? fetchIosReviews(app.iosId, 50).catch(() => [])
        : Promise.resolve([]),
      (platform === "all" || platform === "android") && app.googlePlayId
        ? fetchPlayReviews(app.googlePlayId, 50).catch(() => [])
        : Promise.resolve([]),
    ]);

    // Upsert iOS reviews
    for (const r of iosReviews) {
      await db.asoReview.upsert({
        where: { appId_platform_reviewId: { appId, platform: "ios", reviewId: r.id } },
        create: {
          appId, platform: "ios", reviewId: r.id,
          rating: r.rating, title: r.title, body: r.body,
          authorName: r.reviewerNickname, reviewDate: r.createdDate,
          territory: r.territory,
        },
        update: { rating: r.rating, title: r.title, body: r.body, updatedAt: new Date() },
      });
    }

    // Upsert Android reviews
    for (const r of androidReviews) {
      await db.asoReview.upsert({
        where: { appId_platform_reviewId: { appId, platform: "android", reviewId: r.reviewId } },
        create: {
          appId, platform: "android", reviewId: r.reviewId,
          rating: r.rating, body: r.body,
          authorName: r.authorName, reviewDate: r.date,
          language: r.language,
          replyText: r.replyText, replyDate: r.replyDate,
        },
        update: { rating: r.rating, body: r.body, replyText: r.replyText, updatedAt: new Date() },
      });
    }
  }

  const where = {
    appId,
    ...(platform !== "all" ? { platform } : {}),
    ...(ratingFilter ? { rating: ratingFilter } : {}),
  };

  const reviews = await db.asoReview.findMany({
    where,
    orderBy: [{ rating: "asc" }, { reviewDate: "desc" }],
    take: 100,
  });

  return NextResponse.json({ reviews, total: reviews.length });
}

// ─── POST: AI返信案生成 or 実際の返信送信 ────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { appId } = await params;
  const body = await req.json() as { reviewId: string; action: "suggest" | "reply"; replyText?: string };

  const app = await db.asoApp.findUnique({ where: { id: appId } });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  const review = await db.asoReview.findFirst({ where: { appId, id: body.reviewId } });
  if (!review) return NextResponse.json({ error: "review not found" }, { status: 404 });

  // AI 返信案生成
  if (body.action === "suggest") {
    const prompt = `あなたは ${app.name} のカスタマーサポート担当です。以下のApp Storeレビューへの返信案を日本語で1つ生成してください。

評価: ★${review.rating}
タイトル: ${review.title || "（なし）"}
内容: ${review.body}

要件:
- 感謝の気持ちを伝える
- ${review.rating <= 2 ? "問題を認め、改善への取り組みを伝える" : "ポジティブな体験を喜び、継続利用を促す"}
- 150文字以内
- 自然で温かみのある言葉で
- 返信文のみ出力（説明不要）`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const suggestion = message.content[0].type === "text" ? message.content[0].text.trim() : "";

    await db.asoReview.update({
      where: { id: review.id },
      data: { aiReplySuggestion: suggestion },
    });

    return NextResponse.json({ suggestion });
  }

  // 実際の返信送信
  if (body.action === "reply" && body.replyText) {
    if (review.platform === "ios" && app.iosId) {
      await replyToReview(review.reviewId, body.replyText);
    } else if (review.platform === "android" && app.googlePlayId) {
      await replyToPlayReview(app.googlePlayId, review.reviewId, body.replyText);
    }

    await db.asoReview.update({
      where: { id: review.id },
      data: { replyText: body.replyText, replyDate: new Date().toISOString() },
    });

    await writeAuditLog({
      action: "aso_review_reply",
      targetTable: "AsoReview",
      targetId: review.id,
      afterValue: { replyText: body.replyText },
      req,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
