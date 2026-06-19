"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type VideoStat = {
  id: string;
  videoId: string;
  title: string | null;
  url: string | null;
  thumbnail: string | null;
  publishedAt: string | null;
  views: number;
  likes: number;
  comments: number;
};

type AccountBlock = {
  account: { id: string; username: string; url: string | null; channelId: string | null; lastSyncedAt: string | null };
  totals: { videos: number; views: number; likes: number; comments: number };
  videos: VideoStat[];
};

function fmt(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function YouTubePage() {
  const { appId } = useParams<{ appId: string }>();
  const [blocks, setBlocks] = useState<AccountBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/sns/${appId}/youtube/stats`);
    if (res.ok) {
      const data = await res.json();
      setBlocks(data.accounts ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [appId]);

  async function sync() {
    setSyncing(true);
    setMsg(null);
    const res = await fetch(`/api/sns/${appId}/youtube/stats`, { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (res.ok) {
      const total = (data.results ?? []).reduce((s: number, r: { videos: number }) => s + r.videos, 0);
      const errs = (data.results ?? []).filter((r: { error?: string }) => r.error);
      setMsg(`同期完了：${total}本の動画データを取得${errs.length ? `（${errs.length}アカウントでエラー：${errs.map((e: { username: string; error?: string }) => `${e.username}=${e.error}`).join(" / ")}）` : ""}`);
      await load();
    } else {
      setMsg(`エラー：${data.error}`);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-semibold text-[#1d1d1f]">動画データ（YouTube）</h1>
          <p className="text-[12px] text-[#86868b] mt-0.5">各チャンネルの動画の再生数・高評価・コメントを追跡（公開統計）。</p>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="text-[12px] font-medium bg-[#079147] text-white px-4 py-2 rounded-md hover:bg-[#067a3c] transition-colors disabled:opacity-50"
        >
          {syncing ? "同期中…" : "今すぐ同期"}
        </button>
      </div>

      {msg && <div className="mb-4 text-[12px] text-[#1d1d1f] bg-[#f5f5f7] rounded-md px-3 py-2">{msg}</div>}

      {loading ? (
        <p className="text-[13px] text-[#86868b]">読み込み中…</p>
      ) : blocks.length === 0 ? (
        <p className="text-[13px] text-[#86868b]">YouTube アカウントが登録されていません。</p>
      ) : (
        blocks.map((b) => (
          <section key={b.account.id} className="mb-8">
            <div className="flex items-baseline gap-3 mb-2">
              <a href={b.account.url ?? "#"} target="_blank" rel="noreferrer" className="text-[15px] font-semibold text-[#1d1d1f] hover:underline">
                @{b.account.username}
              </a>
              <span className="text-[12px] text-[#86868b]">
                {b.totals.videos}本 · 再生 {fmt(b.totals.views)} · 高評価 {fmt(b.totals.likes)} · コメント {fmt(b.totals.comments)}
              </span>
              {!b.account.channelId && <span className="text-[11px] text-[#bf4800]">未同期</span>}
            </div>

            {b.videos.length === 0 ? (
              <p className="text-[12px] text-[#86868b]">データなし。「今すぐ同期」で取得します。</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#e8e8ed]">
                <table className="w-full text-[12px]">
                  <thead className="bg-[#f5f5f7] text-[#86868b]">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">動画</th>
                      <th className="text-right font-medium px-3 py-2">再生</th>
                      <th className="text-right font-medium px-3 py-2">高評価</th>
                      <th className="text-right font-medium px-3 py-2">コメント</th>
                      <th className="text-right font-medium px-3 py-2">投稿日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.videos.map((v) => (
                      <tr key={v.id} className="border-t border-[#e8e8ed] hover:bg-[#fafafa]">
                        <td className="px-3 py-2 max-w-[360px]">
                          <a href={v.url ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#1d1d1f] hover:underline">
                            {v.thumbnail && <img src={v.thumbnail} alt="" className="w-12 h-7 object-cover rounded flex-shrink-0" />}
                            <span className="truncate">{v.title || v.videoId}</span>
                          </a>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(v.views)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(v.likes)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(v.comments)}</td>
                        <td className="px-3 py-2 text-right text-[#86868b]">{v.publishedAt?.slice(0, 10) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
