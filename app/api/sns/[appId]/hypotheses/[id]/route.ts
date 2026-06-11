import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { generatePostAssets } from "@/lib/snsAssets";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string; id: string }> }
) {
  // COMMON.md §1: 状態変更は認証必須（Fleet Review対応で追加）
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const updated = await db.snsHypothesis.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.rejectionNote !== undefined && { rejectionNote: body.rejectionNote }),
      ...(body.contentBrief !== undefined && { contentBrief: body.contentBrief }),
      ...(body.metrics !== undefined && { metrics: body.metrics }),
      ...(body.postedAt !== undefined && { postedAt: body.postedAt ? new Date(body.postedAt) : null }),
      ...(body.briefSentAt !== undefined && { briefSentAt: body.briefSentAt ? new Date(body.briefSentAt) : null }),
    },
  });

  // 承認時に投稿アセット（画像+キャプション）を自動生成（fire-and-forget、1回のみ）
  // 人間の役割は「承認」と「投稿Go」のみ — 間の工程は自動化
  if (body.status === "approved") {
    generatePostAssets(id).catch((e) =>
      console.error(`[hypotheses] asset generation trigger failed for ${id}:`, e)
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string; id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await db.snsHypothesis.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
