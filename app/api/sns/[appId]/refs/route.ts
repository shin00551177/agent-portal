import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const refs = await db.snsRefVideo.findMany({
    where: { appId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(refs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const body = await req.json();

  const ref = await db.snsRefVideo.create({
    data: {
      appId,
      url: body.url,
      platform: body.platform ?? "その他",
      account: body.account ?? null,
      title: body.title ?? null,
      views: body.views ?? null,
      likes: body.likes ?? null,
      comments: body.comments ?? null,
      shares: body.shares ?? null,
      duration: body.duration ?? null,
      postedDate: body.postedDate ?? null,
      hashtags: body.hashtags ?? null,
      bgm: body.bgm ?? null,
      thumbnail: body.thumbnail ?? null,
    },
  });

  return NextResponse.json(ref, { status: 201 });
}
