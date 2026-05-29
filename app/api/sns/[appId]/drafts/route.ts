import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type DraftItem = {
  platform: string;
  copy: string;
  hashtags: string[];
  imagePrompt?: string | null;
  notes?: string | null;
  confidence?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const { items } = await req.json() as { items: DraftItem[] };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  const drafts = await Promise.all(
    items.map((item) =>
      db.snsDraft.create({
        data: {
          appId,
          platform: item.platform,
          copy: item.copy,
          hashtags: item.hashtags ?? [],
          imagePrompt: item.imagePrompt ?? null,
          notes: item.notes ?? null,
          status: "pending",
          confidence: item.confidence ?? "medium",
          dataFreshness: new Date(),
        },
      })
    )
  );

  return NextResponse.json({ drafts });
}
