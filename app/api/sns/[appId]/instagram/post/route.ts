import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { publishImagePost } from "@/lib/instagram";

// POST /api/sns/[appId]/instagram/post
// 承認済み仮説（approved/briefed）に紐づくコンテンツをInstagramに投稿する。
// COMMON.md §1: 外部書き込みは認証 + 承認済みステータス必須。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { appId } = await params;
  // MVP: twomiのみ（環境変数のトークンがtwomi IGアカウント紐付けのため）
  if (appId !== "twomi") {
    return NextResponse.json({ error: "instagram posting is only configured for twomi" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({})) as {
    hypothesisId?: string;
    imageUrl?: string;
    caption?: string;
  };
  if (!body.hypothesisId || !body.imageUrl || !body.caption) {
    return NextResponse.json({ error: "hypothesisId, imageUrl, caption are required" }, { status: 400 });
  }

  // 承認ゲート: approved または briefed のみ投稿可能
  const hypothesis = await db.snsHypothesis.findUnique({ where: { id: body.hypothesisId } });
  if (!hypothesis || hypothesis.appId !== appId) {
    return NextResponse.json({ error: "hypothesis not found" }, { status: 404 });
  }
  if (!["approved", "briefed"].includes(hypothesis.status)) {
    return NextResponse.json({ error: `hypothesis status is "${hypothesis.status}" — must be approved or briefed` }, { status: 409 });
  }

  try {
    const { mediaId } = await publishImagePost(body.imageUrl, body.caption);

    await db.snsHypothesis.update({
      where: { id: hypothesis.id },
      data: { status: "posted", postedAt: new Date(), metrics: { igMediaId: mediaId } },
    });

    await writeAuditLog({
      action: "instagram_post",
      targetTable: "SnsHypothesis",
      targetId: hypothesis.id,
      afterValue: { mediaId, caption: body.caption.slice(0, 100) },
      req,
    });

    return NextResponse.json({ mediaId, hypothesisId: hypothesis.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
