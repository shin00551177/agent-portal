// Instagram 動画データの同期ロジック（route と cron で共有）。
// SnsAccount(platform="instagram") を起点に igUserId を解決し、
// 各メディアの最新指標を SnsVideoStat に1行ずつ追加（時系列）。
//
// 重要: IG insights は「トークンが管理するアカウント」のみ取得可能。
// 対象アカウントが同一 Meta Business になく token 権限外の場合は、
// アカウント単位で error を返す（YouTube のように公開取得はできない）。

import { db } from "@/lib/db";
import { listManagedIgAccounts, getAccountMedia } from "@/lib/instagram";

export type InstagramSyncResult = {
  accountId: string;
  username: string;
  igUserId: string | null;
  videos: number;
  error?: string;
};

export async function syncInstagramForApp(appId: string, maxMedia = 50): Promise<InstagramSyncResult[]> {
  const accounts = await db.snsAccount.findMany({ where: { appId, platform: "instagram" } });
  if (accounts.length === 0) return [];

  // トークンが管理する IG アカウント一覧を1度だけ取得し、username→igUserId を解決
  let managed: Record<string, string> = {};
  let discoveryError: string | null = null;
  try {
    const list = await listManagedIgAccounts();
    managed = Object.fromEntries(list.map((a) => [a.username.toLowerCase(), a.igUserId]));
  } catch (e) {
    discoveryError = e instanceof Error ? e.message : String(e);
  }

  return Promise.all(
    accounts.map(async (account): Promise<InstagramSyncResult> => {
      try {
        // igUserId: 保存済み → なければ管理アカウント一覧から username で解決
        const igUserId = account.igUserId ?? managed[account.username.toLowerCase()] ?? null;
        if (!igUserId) {
          throw new Error(
            discoveryError
              ? `Meta token のアカウント取得に失敗: ${discoveryError}`
              : `"@${account.username}" は現在の Meta token の管理対象外（同一 Meta Business に追加が必要）`,
          );
        }

        const media = await getAccountMedia(igUserId, maxMedia);
        if (media.length > 0) {
          await db.snsVideoStat.createMany({
            data: media.map((m) => ({
              appId: account.appId,
              accountId: account.id,
              platform: "instagram",
              videoId: m.mediaId,
              title: m.caption?.slice(0, 200) ?? null,
              url: m.permalink,
              thumbnail: m.thumbnail,
              publishedAt: m.timestamp ? new Date(m.timestamp) : null,
              views: m.views,
              likes: m.likes,
              comments: m.comments,
              extra: { reach: m.reach, saved: m.saved, shares: m.shares, mediaType: m.mediaType, mediaProductType: m.mediaProductType },
            })),
          });
        }

        await db.snsAccount.update({
          where: { id: account.id },
          data: { igUserId, lastSyncedAt: new Date() },
        });

        return { accountId: account.id, username: account.username, igUserId, videos: media.length };
      } catch (e) {
        return {
          accountId: account.id,
          username: account.username,
          igUserId: account.igUserId,
          videos: 0,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }),
  );
}
