import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateImage } from "@/lib/imageGen";

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

  // Save all drafts first
  const drafts = await Promise.all(
    items.map((item) =>
      db.snsDraft.create({
        data: {
          appId,
          platform: item.platform,
          copy: item.copy,
          hashtags: item.hashtags ?? [],
          imagePrompt: item.imagePrompt ?? null,
          imageStatus: item.imagePrompt ? "generating" : null,
          notes: item.notes ?? null,
          status: "pending",
          confidence: item.confidence ?? "medium",
          dataFreshness: new Date(),
        },
      })
    )
  );

  // Generate images in parallel for drafts that have a prompt
  await Promise.all(
    drafts
      .filter((d) => d.imagePrompt)
      .map(async (d) => {
        const result = await generateImage(d.imagePrompt!, d.platform);
        await db.snsDraft.update({
          where: { id: d.id },
          data:
            "url" in result
              ? { imageUrl: result.url, imageStatus: "done" }
              : { imageStatus: "error" },
        });
      })
  );

  const updatedDrafts = await db.snsDraft.findMany({
    where: { id: { in: drafts.map((d) => d.id) } },
  });

  return NextResponse.json({ drafts: updatedDrafts });
}
