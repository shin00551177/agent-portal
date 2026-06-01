import OpenAI from "openai";

export async function generateImage(
  imagePrompt: string,
  _platform: string
): Promise<{ url: string } | { error: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: "OPENAI_API_KEY not configured" };

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: `SNS promotional image, bright and modern style: ${imagePrompt}`.slice(0, 1000),
      size: "1024x1024",
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
