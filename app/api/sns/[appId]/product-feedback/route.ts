import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const { searchParams } = new URL(req.url);
  const processed = searchParams.get("processed");

  const feedbacks = await db.snsProductFeedback.findMany({
    where: {
      appId,
      ...(processed !== null && { processed: processed === "true" }),
    },
    orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  return NextResponse.json(feedbacks);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const body = await req.json();
  const fb = await db.snsProductFeedback.create({
    data: {
      appId,
      source: body.source,
      type: body.type,
      content: body.content,
      url: body.url ?? null,
      author: body.author ?? null,
      importance: body.importance ?? "medium",
    },
  });
  return NextResponse.json(fb, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId: _ } = await params;
  const { id, processed } = await req.json();
  const updated = await db.snsProductFeedback.update({
    where: { id },
    data: { processed },
  });
  return NextResponse.json(updated);
}
