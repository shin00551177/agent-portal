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

// ─────────────────────────────────────────────────────────────────────────
// 複数アカウントのデータ追跡（読み取り専用 / level-2 集計指標）
// 投稿は伴わない。IG insights は「トークンが管理するアカウント」のみ取得可能
// （YouTube と違い公開アカウントの任意取得は不可）。
// ─────────────────────────────────────────────────────────────────────────

function metaToken(): string {
  const token = process.env.META_SYSTEM_USER_TOKEN;
  if (!token) throw new Error("META_SYSTEM_USER_TOKEN not set");
  return token;
}

// igId に依存しない GET（複数アカウントを跨ぐため env() を使わない）
async function graphGet(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH}${path}`);
  Object.entries({ ...params, access_token: metaToken() }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (json.error) throw new Error(`IG Graph ${path}: ${json.error.message}`);
  return json;
}

export type ManagedIgAccount = { username: string; igUserId: string; pageName: string | null };

/**
 * このトークンが管理する全 Instagram Business/Creator アカウントを列挙する。
 * /me/accounts（FBページ）→ 各ページの instagram_business_account。
 * username → igUserId のマッピングに使う（SnsAccount.igUserId の自動解決）。
 */
export async function listManagedIgAccounts(): Promise<ManagedIgAccount[]> {
  const out: ManagedIgAccount[] = [];
  let after: string | undefined;
  do {
    const params: Record<string, string> = {
      fields: "name,instagram_business_account{id,username}",
      limit: "100",
    };
    if (after) params.after = after;
    const data = await graphGet("/me/accounts", params);
    for (const page of data.data ?? []) {
      const iba = page.instagram_business_account;
      if (iba?.id && iba?.username) {
        out.push({ username: iba.username, igUserId: iba.id, pageName: page.name ?? null });
      }
    }
    after = data.paging?.cursors?.after;
    if (!data.paging?.next) break;
  } while (after);
  return out;
}

export type IgMediaStat = {
  mediaId: string;
  caption: string | null;
  mediaType: string | null;       // IMAGE | VIDEO | CAROUSEL_ALBUM
  mediaProductType: string | null; // FEED | REELS
  permalink: string | null;
  thumbnail: string | null;
  timestamp: string | null;
  likes: number;
  comments: number;
  views: number;                  // Reels の再生数（取得できなければ0）
  reach: number;
  saved: number;
  shares: number;
};

/** 指定 IG アカウントの最近のメディアと指標を取得（動画＝Reels/VIDEO 中心）。 */
export async function getAccountMedia(igUserId: string, limit = 50): Promise<IgMediaStat[]> {
  const data = await graphGet(`/${igUserId}/media`, {
    fields: "id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count",
    limit: String(limit),
  });

  const results: IgMediaStat[] = [];
  for (const m of data.data ?? []) {
    const stat: IgMediaStat = {
      mediaId: m.id,
      caption: m.caption ?? null,
      mediaType: m.media_type ?? null,
      mediaProductType: m.media_product_type ?? null,
      permalink: m.permalink ?? null,
      thumbnail: m.thumbnail_url ?? m.media_url ?? null,
      timestamp: m.timestamp ?? null,
      likes: m.like_count ?? 0,
      comments: m.comments_count ?? 0,
      views: 0,
      reach: 0,
      saved: 0,
      shares: 0,
    };
    // insights はメディア種別で対応指標が異なり、失敗し得るのでベストエフォート
    try {
      const isReel = m.media_product_type === "REELS";
      const metric = isReel ? "reach,saved,shares,plays" : "reach,saved";
      const ins = await graphGet(`/${m.id}/insights`, { metric });
      for (const row of ins.data ?? []) {
        const v = row.values?.[0]?.value ?? 0;
        if (row.name === "plays") stat.views = v;
        else if (row.name === "reach") stat.reach = v;
        else if (row.name === "saved") stat.saved = v;
        else if (row.name === "shares") stat.shares = v;
      }
    } catch {
      // insights 不可（画像/権限/メディア削除等）はコア指標のみで続行
    }
    results.push(stat);
  }
  return results;
}

/** アカウント概要（フォロワー数等）を igUserId 指定で取得。 */
export async function getAccountSnapshotById(igUserId: string) {
  return graphGet(`/${igUserId}`, { fields: "username,followers_count,media_count" });
}
