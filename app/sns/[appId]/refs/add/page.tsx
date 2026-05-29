"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// ─── 共通型 ────────────────────────────────────────────────────────────────
type VideoCandidate = {
  url: string;
  account: string;
  title: string;
  views: number;
  likes: number;
  duration: number;
  platform: string;
  thumbnail: string;
  matchedKeyword?: string;
};

// ─── URL手動追加タブ ────────────────────────────────────────────────────────
type ManualStep = "idle" | "fetching" | "preview" | "saving" | "analyzing" | "done" | "error";

type Meta = VideoCandidate & {
  comments: number;
  shares: number;
  postedDate: string;
  hashtags: string;
  bgm: string;
};

function ManualTab({ appId }: { appId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<ManualStep>("idle");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchMeta() {
    if (!url.trim()) return;
    setStep("fetching");
    setError(null);
    setMeta(null);
    const res = await fetch(`/api/sns/${appId}/refs/fetch-meta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "取得失敗"); setStep("error"); return; }
    setMeta(data);
    setStep("preview");
  }

  async function saveAndAnalyze() {
    if (!meta) return;
    setStep("saving");
    setError(null);
    const res = await fetch(`/api/sns/${appId}/refs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...meta, url }),
    });
    const saved = await res.json();
    if (!res.ok) { setError(saved.error ?? "保存失敗"); setStep("error"); return; }
    setStep("analyzing");
    await fetch(`/api/sns/${appId}/refs/${saved.id}/analyze`, { method: "POST" });
    setStep("done");
    setTimeout(() => router.push(`/sns/${appId}/refs`), 1200);
  }

  const busy = (["fetching", "saving", "analyzing"] as ManualStep[]).includes(step);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@..."
          disabled={busy}
          className="w-full px-4 py-3 rounded-xl border border-[#d2d2d7] text-[14px] focus:outline-none focus:border-[#0071e3] transition-colors"
        />
        <button
          onClick={fetchMeta}
          disabled={!url.trim() || busy}
          className="w-full py-3 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] disabled:opacity-40 transition-colors"
        >
          {step === "fetching" ? "メタデータ取得中..." : "メタデータを取得"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      {meta && (["preview", "saving", "analyzing"] as ManualStep[]).includes(step) && (
        <div className="rounded-2xl border border-[#f0f0f0] divide-y divide-[#f0f0f0]">
          {meta.thumbnail && (
            <div className="p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={meta.thumbnail} alt="" className="w-full rounded-xl object-cover max-h-48" />
            </div>
          )}
          <div className="p-4 space-y-2">
            {([
              ["プラットフォーム", meta.platform],
              ["アカウント", meta.account],
              ["タイトル", meta.title],
              ["再生数", meta.views?.toLocaleString()],
              ["いいね", meta.likes?.toLocaleString()],
              ["時間", meta.duration ? `${meta.duration}秒` : ""],
              ["投稿日", meta.postedDate],
              ["ハッシュタグ", meta.hashtags],
              ["BGM", meta.bgm],
            ] as [string, string][]).map(([label, val]) =>
              val ? (
                <div key={label} className="flex gap-3 text-[13px]">
                  <span className="text-[#86868b] w-24 flex-shrink-0">{label}</span>
                  <span className="text-[#1d1d1f] break-all">{val}</span>
                </div>
              ) : null
            )}
          </div>
          <div className="p-4">
            <button
              onClick={saveAndAnalyze}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-[#1d1d1f] text-white text-[14px] font-medium hover:bg-black disabled:opacity-40 transition-colors"
            >
              {step === "saving" ? "保存中..." : step === "analyzing" ? "AI分析中..." : "保存してAI分析を開始"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-[14px] font-medium text-emerald-700">
          分析完了。レファランス一覧に戻ります...
        </div>
      )}
    </div>
  );
}

// ─── AI検索タブ ─────────────────────────────────────────────────────────────
const PLATFORMS = ["YouTube", "TikTok"] as const;
type Platform = (typeof PLATFORMS)[number];

function AiSearchTab({ appId }: { appId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform>("YouTube");
  const [searching, setSearching] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [results, setResults] = useState<VideoCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResults([]);
    setSelected(new Set());
    setKeywords([]);

    const res = await fetch(`/api/sns/${appId}/refs/ai-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, platform, count: 12 }),
    });
    const data = await res.json();
    setSearching(false);
    if (!res.ok) { setError(data.error ?? "検索失敗"); return; }
    setKeywords(data.keywords ?? []);
    setResults(data.results ?? []);
  }

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  }

  async function saveSelected() {
    if (selected.size === 0) return;
    setSaving(true);
    setError(null);

    const toSave = results.filter((r) => selected.has(r.url));
    const savedIds: string[] = [];

    for (const v of toSave) {
      const res = await fetch(`/api/sns/${appId}/refs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const saved = await res.json();
      if (res.ok) savedIds.push(saved.id);
    }

    // 並行でAI分析
    await Promise.all(
      savedIds.map((id) =>
        fetch(`/api/sns/${appId}/refs/${id}/analyze`, { method: "POST" })
      )
    );

    setSaving(false);
    router.push(`/sns/${appId}/refs`);
  }

  return (
    <div className="space-y-6">
      {/* プラットフォーム選択 */}
      <div className="flex gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-colors ${
              platform === p
                ? "bg-[#1d1d1f] text-white"
                : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#ebebeb]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* クエリ入力 */}
      <div className="space-y-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`例: Twomiっぽい恋愛AI系の動画\nAIアバターと会話する系\n10〜20代向けのバズりやすいエンタメ`}
          rows={3}
          disabled={searching}
          className="w-full px-4 py-3 rounded-xl border border-[#d2d2d7] text-[14px] resize-none focus:outline-none focus:border-[#0071e3] transition-colors"
        />
        <button
          onClick={search}
          disabled={!query.trim() || searching}
          className="w-full py-3 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] disabled:opacity-40 transition-colors"
        >
          {searching ? "AI検索中..." : "AIでバズ動画を探す"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      {/* 生成されたキーワード */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="text-[12px] px-3 py-1 rounded-full bg-[#f0f0f0] text-[#1d1d1f]"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* 検索結果 */}
      {results.length > 0 && (
        <>
          <div className="divide-y divide-[#f0f0f0]">
            {results.map((r) => {
              const isSelected = selected.has(r.url);
              return (
                <button
                  key={r.url}
                  onClick={() => toggle(r.url)}
                  className={`w-full text-left py-4 flex items-start gap-4 transition-colors ${
                    isSelected ? "bg-blue-50 -mx-4 px-4 rounded-xl" : ""
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                    isSelected ? "bg-[#0071e3] border-[#0071e3]" : "border-[#d2d2d7]"
                  }`} />
                  {r.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.thumbnail}
                      alt=""
                      className="w-20 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-[13px] font-medium text-[#1d1d1f] line-clamp-2">{r.title}</p>
                    <p className="text-[12px] text-[#6e6e73]">@{r.account}</p>
                    <div className="flex gap-3 text-[11px] text-[#86868b]">
                      {r.views > 0 && <span>{r.views.toLocaleString()} 再生</span>}
                      {r.matchedKeyword && (
                        <span className="bg-[#f5f5f7] px-2 py-0.5 rounded-full">{r.matchedKeyword}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selected.size > 0 && (
            <div className="sticky bottom-0 pb-4 pt-2 bg-white">
              <button
                onClick={saveSelected}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-[#1d1d1f] text-white text-[14px] font-medium hover:bg-black disabled:opacity-40 transition-colors"
              >
                {saving
                  ? "保存・分析中..."
                  : `選択した ${selected.size} 件を保存してAI分析`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── ページ本体 ─────────────────────────────────────────────────────────────
type Tab = "url" | "ai";

export default function AddRefPage() {
  const { appId } = useParams<{ appId: string }>();
  const [tab, setTab] = useState<Tab>("ai");

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <Link href={`/sns/${appId}/refs`} className="text-[13px] text-[#0071e3] hover:underline">
          ← レファランス一覧
        </Link>
        <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight mt-3">
          動画を追加
        </h2>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-1 bg-[#ebebeb] rounded-xl p-1 w-fit">
        {([["ai", "AIで探す"], ["url", "URLを手動追加"]] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
              tab === t
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ai" ? <AiSearchTab appId={appId} /> : <ManualTab appId={appId} />}
    </div>
  );
}
