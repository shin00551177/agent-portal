import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string; id: string }> }
) {
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
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string; id: string }> }
) {
  const { id } = await params;
  await db.snsHypothesis.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
