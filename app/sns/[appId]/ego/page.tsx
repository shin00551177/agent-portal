"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type EgoHit = {
  id: string;
  source: string;
  keyword: string;
  title: string;
  url: string;
  snippet: string | null;
  author: string | null;
  score: number;
  sentiment: string | null;
  category: string | null;
  engagement: { views?: number; likes?: number; comments?: number } | null;
  createdAt: string;
};

const SOURCE_LABEL: Record<string, string> = {
  appstore: "App Store", playstore: "Play Store",
  youtube: "YouTube", x: "X", instagram: "Instagram",
  tiktok: "TikTok", rss: "RSS", web: "Web",
};

function fmt(n?: number) {
  if (n == null) return null;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function EgoPage() {
  const { appId } = useParams<{ appId: string }>();
  const [hits, setHits] = useState<EgoHit[]>([]);
  const [collecting, setCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch(`/api/sns/${appId}/ego-hits?days=30`);
    if (res.ok) setHits(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [appId]);

  async function collect() {
    setCollecting(true);
    setCollectResult(null);
    const res = await fetch(`/api/sns/${appId}/ego-hits/collect`, { method: "POST" });
    const data = await res.json();
    setCollecting(false);
    if (res.ok) {
      const msg = data.message
        ? `${data.saved}件追加 — ${data.message}${data.debug ? ` [YouTube:${data.debug.ytKey ? "✓" : "✗"} CSE:${data.debug.cseKey ? "✓" : "✗"} raw:${data.debug.rawFound}件]` : ""}`
        : `${data.saved}件追加（スキップ ${data.skipped}件 / 検出 ${data.total_found}件）`;
      setCollectResult(msg);
      await load();
    } else {
      setCollectResult(`エラー: ${data.error}`);
    }
  }

  const buzzHits  = hits.filter((h) => h.category === "buzz").sort((a, b) => b.score - a.score);
  const negHits   = hits.filter((h) => h.sentiment === "negative");
  const posHits   = hits.filter((h) => h.sentiment === "positive");
  const allSorted = [...hits].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">エゴサ</h2>
          <p className="text-[13px] text-[#6e6e73] mt-1">
            {loading ? "読み込み中..." : `直近30日 ${hits.length}件収集`}
          </p>
          {collectResult && (
            <p className={`text-[12px] mt-1 ${collectResult.startsWith("エラー") ? "text-red-500" : "text-emerald-600"}`}>
              {collectResult}
            </p>
          )}
        </div>
        <button
          onClick={collect}
          disabled={collecting}
          className="px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-[13px] font-medium hover:bg-black disabled:opacity-40 transition-colors flex-shrink-0"
        >
          {collecting ? "収集中..." : "今すぐエゴサ"}
        </button>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "合計",       n: hits.length,    color: "text-[#1d1d1f]" },
          { label: "バズ",       n: buzzHits.length, color: "text-emerald-600" },
          { label: "ネガ",       n: negHits.length,  color: "text-red-500" },
          { label: "ポジ",       n: posHits.length,  color: "text-blue-500" },
        ].map(({ label, n, color }) => (
          <div key={label} className="rounded-2xl border border-[#f0f0f0] p-4 text-center">
            <p className={`text-[28px] font-semibold leading-none ${color}`}>{n}</p>
            <p className="text-[11px] text-[#86868b] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* バズトップ */}
      {buzzHits.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-3">
            🔥 バズ上位
          </p>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 divide-y divide-emerald-100">
            {buzzHits.slice(0, 5).map((h) => {
              const eng = h.engagement as { views?: number; likes?: number; comments?: number } | null;
              return (
                <a key={h.id} href={h.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start justify-between px-4 py-3 gap-4 group hover:bg-emerald-100/50 transition-colors">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[13px] font-medium text-emerald-900 group-hover:text-emerald-700 truncate">
                      {h.title}
                    </p>
                    {h.author && <p className="text-[11px] text-emerald-500">@{h.author}</p>}
                    {eng && (
                      <div className="flex gap-3 text-[11px] text-emerald-600">
                        {fmt(eng.views)    && <span>👁 {fmt(eng.views)}</span>}
                        {fmt(eng.likes)    && <span>👍 {fmt(eng.likes)}</span>}
                        {fmt(eng.comments) && <span>💬 {fmt(eng.comments)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      {SOURCE_LABEL[h.source] ?? h.source}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      {h.score}pt
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* 全件一覧 */}
      {hits.length === 0 ? (
        <div className="py-16 rounded-2xl border border-dashed border-[#d2d2d7] text-center">
          <p className="text-[14px] text-[#6e6e73]">「今すぐエゴサ」でデータを収集します</p>
        </div>
      ) : (
        <section>
          <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-3">全件（スコア順）</p>
          <div className="divide-y divide-[#f0f0f0]">
            {allSorted.map((h) => {
              const eng = h.engagement as { views?: number; likes?: number; comments?: number } | null;
              return (
                <a key={h.id} href={h.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start justify-between py-3 gap-4 group">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[13px] font-medium text-[#1d1d1f] group-hover:text-[#079147] transition-colors truncate">
                      {h.title}
                    </p>
                    <div className="flex gap-3 text-[11px] text-[#86868b]">
                      {h.author && <span>@{h.author}</span>}
                      {eng && fmt(eng.views) && <span>👁 {fmt(eng.views)}</span>}
                      {eng && fmt(eng.likes) && <span>👍 {fmt(eng.likes)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-[#86868b] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
                      {SOURCE_LABEL[h.source] ?? h.source}
                    </span>
                    {h.sentiment === "negative" && (
                      <span className="text-[11px] text-red-500 bg-red-50 px-2 py-0.5 rounded-full">ネガ</span>
                    )}
                    {h.category === "buzz" && (
                      <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">バズ</span>
                    )}
                    <span className="text-[11px] font-semibold text-[#86868b]">{h.score}pt</span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
