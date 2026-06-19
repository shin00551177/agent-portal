// YouTube 動画データの同期ロジック（route と cron で共有）。
// SnsAccount(platform="youtube") を起点に channelId を解決し、
// 各動画の最新統計を SnsVideoStat に1行ずつ追加（時系列）。

import { db } from "@/lib/db";
import { resolveChannel, getChannelById, getChannelVideos } from "@/lib/youtube";

export type YouTubeSyncResult = {
  accountId: string;
  username: string;
  channelId: string | null;
  videos: number;
  error?: string;
};

/** 1アカウントを同期。channelId 未解決なら url/username から解決して保存する。 */
async function syncAccount(account: {
  id: string;
  appId: string;
  username: string;
  url: string | null;
  channelId: string | null;
}, maxVideos: number): Promise<YouTubeSyncResult> {
  try {
    // channelId を解決（未保存なら handle/URL から）
    const channel = account.channelId
      ? await getChannelById(account.channelId)
      : await resolveChannel(account.url || account.username);

    const videos = await getChannelVideos(channel.uploadsPlaylistId, maxVideos);

    if (videos.length > 0) {
      await db.snsVideoStat.createMany({
        data: videos.map((v) => ({
          appId: account.appId,
          accountId: account.id,
          platform: "youtube",
          videoId: v.videoId,
          title: v.title,
          url: v.url,
          thumbnail: v.thumbnail,
          publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
          views: v.views,
          likes: v.likes,
          comments: v.comments,
          extra: { subscribers: channel.subscribers, channelVideoCount: channel.videoCount },
        })),
      });
    }

    await db.snsAccount.update({
      where: { id: account.id },
      data: { channelId: channel.channelId, lastSyncedAt: new Date() },
    });

    return { accountId: account.id, username: account.username, channelId: channel.channelId, videos: videos.length };
  } catch (e) {
    return {
      accountId: account.id,
      username: account.username,
      channelId: account.channelId,
      videos: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** appId 配下の全 YouTube アカウントを同期。アカウント単位で隔離（1件失敗が全体を止めない）。 */
export async function syncYouTubeForApp(appId: string, maxVideos = 50): Promise<YouTubeSyncResult[]> {
  const accounts = await db.snsAccount.findMany({ where: { appId, platform: "youtube" } });
  return Promise.all(accounts.map((a) => syncAccount(a, maxVideos)));
}
