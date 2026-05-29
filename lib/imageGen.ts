import OpenAI from "openai";

const PLATFORM_SIZE: Record<string, "1024x1024" | "1792x1024" | "1024x1792"> = {
  youtube:   "1792x1024",
  x:         "1792x1024",
  facebook:  "1792x1024",
  threads:   "1024x1024",
  instagram: "1024x1024",
  tiktok:    "1024x1792",
};

export async function generateImage(
  imagePrompt: string,
  platform: string
): Promise<{ url: string } | { error: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: "OPENAI_API_KEY not configured" };

  const openai = new OpenAI({ apiKey });
  const size = PLATFORM_SIZE[platform] ?? "1024x1024";

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `SNS promotional image, bright and modern style: ${imagePrompt}`,
      size,
      quality: "standard",
      n: 1,
    });
    const url = response.data?.[0]?.url;
    if (!url) return { error: "No URL in response" };
    return { url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg };
  }
}
