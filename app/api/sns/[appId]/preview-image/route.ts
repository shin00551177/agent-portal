import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/imageGen";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  await params;
  const { imagePrompt, platform } = await req.json();
  if (!imagePrompt || !platform) {
    return NextResponse.json({ error: "imagePrompt と platform が必要です" }, { status: 400 });
  }
  const result = await generateImage(imagePrompt, platform);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ url: result.url });
}
