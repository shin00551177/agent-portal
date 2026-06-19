// YouTube Data API v3 client — own-channel video stats (read-only, level-2 metrics).
// GOVERNANCE: aggregated metrics の読み取りのみ。発信・実行は伴わない。
// 公開統計（views/likes/comments）は API キーのみで取得可能（OAuth 不要）。
// ※ 視聴維持率・視聴時間などの深掘り指標は YouTube Analytics API（OAuth）が別途必要。

const API = "https://www.googleapis.com/youtube/v3";

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY not set");
  return key;
}

export type YouTubeChannel = {
  channelId: string;
  title: string;
  uploadsPlaylistId: string;
  subscribers: number;
  videoCount: number;
};

export type YouTubeVideo = {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string | null;
  publishedAt: string | null;
  views: number;
  likes: number;
  comments: number;
};

/**
 * @handle（例 "@twomi_lifemi" または URL）を channelId に解決し、
 * アップロード再生リストID・登録者数・動画数も取得する。
 */
export async function resolveChannel(handleOrUrl: string): Promise<YouTubeChannel> {
  const handle = extractHandle(handleOrUrl);
  const url = new URL(`${API}/channels`);
  url.searchParams.set("part", "snippet,contentDetails,statistics");
  url.searchParams.set("forHandle", handle);
  url.searchParams.set("key", apiKey());

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (json.error) throw new Error(`YouTube channels.forHandle ${handle}: ${json.error.message}`);

  const item = json.items?.[0];
  if (!item) throw new Error(`YouTube channel not found for handle "${handle}"`);

  return {
    channelId: item.id,
    title: item.snippet?.title ?? handle,
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? "",
    subscribers: parseInt(item.statistics?.subscriberCount ?? "0", 10),
    videoCount: parseInt(item.statistics?.videoCount ?? "0", 10),
  };
}

/** channelId からアップロード再生リストID等のチャンネル情報を取得（channelId 既知の場合）。 */
export async function getChannelById(channelId: string): Promise<YouTubeChannel> {
  const url = new URL(`${API}/channels`);
  url.searchParams.set("part", "snippet,contentDetails,statistics");
  url.searchParams.set("id", channelId);
  url.searchParams.set("key", apiKey());

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (json.error) throw new Error(`YouTube channels.id ${channelId}: ${json.error.message}`);

  const item = json.items?.[0];
  if (!item) throw new Error(`YouTube channel not found for id "${channelId}"`);

  return {
    channelId: item.id,
    title: item.snippet?.title ?? channelId,
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? "",
    subscribers: parseInt(item.statistics?.subscriberCount ?? "0", 10),
    videoCount: parseInt(item.statistics?.videoCount ?? "0", 10),
  };
}

/**
 * チャンネルの最近の動画（Shorts 含む）とその統計を取得する。
 * uploads 再生リスト → videoIds → videos.statistics の2段。
 */
export async function getChannelVideos(uploadsPlaylistId: string, max = 50): Promise<YouTubeVideo[]> {
  if (!uploadsPlaylistId) return [];
  const key = apiKey();

  // 1. アップロード再生リストから videoId を収集（ページング）
  const videoIds: string[] = [];
  let pageToken: string | undefined;
  while (videoIds.length < max) {
    const url = new URL(`${API}/playlistItems`);
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("playlistId", uploadsPlaylistId);
    url.searchParams.set("maxResults", String(Math.min(50, max - videoIds.length)));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    url.searchParams.set("key", key);

    const res = await fetch(url.toString(), { cache: "no-store" });
    const json = await res.json();
    if (json.error) throw new Error(`YouTube playlistItems: ${json.error.message}`);

    for (const it of json.items ?? []) {
      const id = it.contentDetails?.videoId;
      if (id) videoIds.push(id);
    }
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  if (videoIds.length === 0) return [];

  // 2. 統計＋snippetを一括取得（videos.list は最大50件/リクエスト）
  const out: YouTubeVideo[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = new URL(`${API}/videos`);
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", key);

    const res = await fetch(url.toString(), { cache: "no-store" });
    const json = await res.json();
    if (json.error) throw new Error(`YouTube videos.list: ${json.error.message}`);

    for (const v of json.items ?? []) {
      out.push({
        videoId: v.id,
        title: v.snippet?.title ?? "",
        url: `https://www.youtube.com/watch?v=${v.id}`,
        thumbnail: v.snippet?.thumbnails?.medium?.url ?? v.snippet?.thumbnails?.default?.url ?? null,
        publishedAt: v.snippet?.publishedAt ?? null,
        views: parseInt(v.statistics?.viewCount ?? "0", 10),
        likes: parseInt(v.statistics?.likeCount ?? "0", 10),
        comments: parseInt(v.statistics?.commentCount ?? "0", 10),
      });
    }
  }
  return out;
}

/** "@twomi_lifemi" / "https://youtube.com/@twomi_lifemi?si=..." → "twomi_lifemi" */
function extractHandle(input: string): string {
  const trimmed = input.trim();
  const m = trimmed.match(/@([A-Za-z0-9._-]+)/);
  if (m) return m[1];
  // URL でも @ でもなければ、そのままハンドルとして扱う
  return trimmed.replace(/^@/, "");
}
