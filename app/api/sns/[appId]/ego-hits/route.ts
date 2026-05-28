import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/sns/[appId]/ego-hits?days=7
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "7", 10);
  const since = new Date(Date.now() - days * 86400 * 1000);

  const hits = await db.egoHit.findMany({
    where: { appId, createdAt: { gte: since } },
    orderBy: { score: "desc" },
  });
  return NextResponse.json(hits);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const { source, keyword, title, url, snippet, author, score, publishedAt,
          category, sentiment, feedbackType, engagement } = await req.json();
  if (!title?.trim() || !url?.trim()) {
    return NextResponse.json({ error: "title and url required" }, { status: 400 });
  }
  const hit = await db.egoHit.create({
    data: {
      appId,
      source: source?.trim() || "manual",
      keyword: keyword?.trim() || "",
      title: title.trim(),
      url: url.trim(),
      snippet: snippet?.trim() || null,
      author: author?.trim() || null,
      score: score ?? 50,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      category: category || null,
      sentiment: sentiment || null,
      feedbackType: feedbackType || null,
      engagement: engagement || null,
    },
  });
  return NextResponse.json(hit, { status: 201 });
}
