const PLATFORM_ASPECT: Record<string, string> = {
  tiktok:    "9:16",
  instagram: "1:1",
  threads:   "1:1",
  youtube:   "16:9",
  x:         "16:9",
  facebook:  "16:9",
};

export async function generateImage(
  imagePrompt: string,
  platform: string
): Promise<{ url: string } | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "GEMINI_API_KEY not configured" };

  const aspectRatio = PLATFORM_ASPECT[platform] ?? "1:1";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: imagePrompt.slice(0, 1000) }],
          parameters: { sampleCount: 1, aspectRatio },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return { error: err.error?.message ?? `HTTP ${res.status}` };
    }

    const data = await res.json();
    const base64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!base64) return { error: "画像データが取得できませんでした" };

    return { url: `data:image/png;base64,${base64}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
