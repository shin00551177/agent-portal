// Instagram Graph API client (Meta System User token)
// COMMON.md §1/§4: 投稿は必ず承認済みコンテンツのみ。直接呼び出しはAPI route経由（auth必須）。

const GRAPH = "https://graph.facebook.com/v21.0";

function env() {
  const token = process.env.META_SYSTEM_USER_TOKEN;
  const igId = process.env.META_IG_BUSINESS_ID;
  if (!token || !igId) throw new Error("META_SYSTEM_USER_TOKEN / META_IG_BUSINESS_ID not set");
  return { token, igId };
}

async function graph(path: string, params: Record<string, string>, method: "GET" | "POST" = "GET") {
  const { token } = env();
  const url = new URL(`${GRAPH}${path}`);
  if (method === "GET") {
    Object.entries({ ...params, access_token: token }).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { cache: "no-store" });
    const json = await res.json();
    if (json.error) throw new Error(`IG Graph ${path}: ${json.error.message}`);
    return json;
  }
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, access_token: token }).toString(),
  });
  const json = await res.json();
  if (json.error) throw new Error(`IG Graph ${path}: ${json.error.message}`);
  return json;
}

/**
 * Publish a single image post to Instagram.
 * Two-step: create media container → publish.
 * imageUrl must be a publicly accessible URL (JPEG, ≥320px).
 */
export async function publishImagePost(imageUrl: string, caption: string): Promise<{ mediaId: string }> {
  const { igId } = env();
  const container = await graph(`/${igId}/media`, { image_url: imageUrl, caption }, "POST");
  const published = await graph(`/${igId}/media_publish`, { creation_id: container.id }, "POST");
  return { mediaId: published.id };
}

/** Fetch insights for a published media (impressions, reach, likes, comments, saves). */
export async function getMediaInsights(mediaId: string) {
  const data = await graph(`/${mediaId}/insights`, {
    metric: "impressions,reach,likes,comments,saved,shares",
  });
  const out: Record<string, number> = {};
  for (const m of data.data ?? []) out[m.name] = m.values?.[0]?.value ?? 0;
  return out;
}

/** Fetch recent media list for the account. */
export async function getRecentMedia(limit = 10) {
  const { igId } = env();
  const data = await graph(`/${igId}/media`, {
    fields: "id,caption,media_type,permalink,timestamp,like_count,comments_count",
    limit: String(limit),
  });
  return data.data ?? [];
}

/** Account-level snapshot (followers, media count). */
export async function getAccountSnapshot() {
  const { igId } = env();
  return graph(`/${igId}`, { fields: "username,followers_count,media_count" });
}
