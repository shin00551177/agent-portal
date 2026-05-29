"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

type EgoHit = {
  id: string; source: string; keyword: string; title: string; url: string;
  snippet: string | null; author: string | null; score: number;
  publishedAt: Date | null; dismissed: boolean;
  category: string | null; sentiment: string | null; feedbackType: string | null; engagement: unknown;
};

const FEEDBACK_LABEL: Record<string, string> = {
  bug: "不具合", feature_request: "要望", praise: "称賛", comparison: "競合",
};

const SENTIMENT_MARK: Record<string, string> = { positive: "▲", negative: "▼", neutral: "—" };

type Tab = "all" | "buzz" | "feedback" | "other";
const TABS: { key: Tab; label: string }[] = [
  { key: "all",      label: "すべて" },
  { key: "buzz",     label: "バズ" },
  { key: "feedback", label: "フィードバック" },
  { key: "other",    label: "その他" },
];

export function EgoHitList({ appId, initialHits }: { appId: string; initialHits: EgoHit[] }) {
  const [hits, setHits] = useState(initialHits);
  const [tab, setTab] = useState<Tab>("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", keyword: "", source: "manual", snippet: "" });
  const [adding, setAdding] = useState(false);

  async function dismiss(id: string) {
    const res = await fetch(`/api/sns/${appId}/ego-hits/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissed: true }),
    });
    if (res.ok) setHits((p) => p.map((h) => h.id === id ? { ...h, dismissed: true } : h));
  }

  async function addHit() {
    if (!form.title.trim() || !form.url.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/sns/${appId}/ego-hits`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) {
      const hit = await res.json();
      setHits((p) => [hit, ...p]);
      setForm({ title: "", url: "", keyword: "", source: "manual", snippet: "" });
      setShowForm(false);
    }
    setAdding(false);
  }

  const active = hits.filter((h) => !h.dismissed);
  const dismissed = hits.filter((h) => h.dismissed);
  const filtered = tab === "all" ? active : active.filter((h) => (h.category ?? "other") === tab);

  const counts: Record<Tab, number> = {
    all: active.length,
    buzz: active.filter((h) => h.category === "buzz").length,
    feedback: active.filter((h) => h.category === "feedback").length,
    other: active.filter((h) => !h.category || h.category === "other").length,
  };

  return (
    <div className="space-y-6">
      {/* §11 不確実性の明示 */}
      <div className="flex items-start gap-2 bg-[#fff7e6] border border-[#f5d89a] rounded-xl px-4 py-3">
        <span className="text-[#a05c00] mt-0.5 shrink-0">⚠</span>
        <p className="text-[12px] text-[#a05c00] leading-relaxed">
          感情・カテゴリ分類はルールベースによる自動判定です（確信度: 中）。誤分類の可能性があります。
          疑わしい分類は手動で確認してください。
          <span className="ml-1 text-[11px] opacity-70">行動規範 §11</span>
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-[#f5f5f7] rounded-xl p-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                tab === t.key ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]"
              }`}>
              {t.label}
              {counts[t.key] > 0 && (
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? "bg-[#1d1d1f] text-white" : "bg-[#6e6e73]/15 text-[#6e6e73]"
                }`}>{counts[t.key]}</span>
              )}
            </button>
          ))}
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>+ 手動登録</Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="border border-[#f0f0f0] rounded-2xl p-5 space-y-3">
          <p className="text-[14px] font-semibold text-[#1d1d1f]">手動登録</p>
          <div className="grid grid-cols-2 gap-3">
            <input className="col-span-2 px-3 py-2 text-[13px] bg-[#f5f5f7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]" placeholder="タイトル *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <input className="col-span-2 px-3 py-2 text-[13px] bg-[#f5f5f7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]" placeholder="URL *" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
            <input className="px-3 py-2 text-[13px] bg-[#f5f5f7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]" placeholder="キーワード" value={form.keyword} onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))} />
            <select className="px-3 py-2 text-[13px] bg-[#f5f5f7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
              <option value="manual">手動</option>
              <option value="google">Google</option>
              <option value="x">X</option>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="threads">Threads</option>
            </select>
            <input className="col-span-2 px-3 py-2 text-[13px] bg-[#f5f5f7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]" placeholder="スニペット（任意）" value={form.snippet} onChange={(e) => setForm((f) => ({ ...f, snippet: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setShowForm(false)}>キャンセル</Button>
            <Button size="sm" onClick={addHit} disabled={adding || !form.title.trim() || !form.url.trim()}>
              {adding ? "追加中..." : "追加"}
            </Button>
          </div>
        </div>
      )}

      {/* Hit list */}
      {filtered.length === 0 ? (
        <p className="text-[#6e6e73] text-[14px] py-12 text-center">
          {tab === "all" ? "エゴサ結果はまだありません" : `「${TABS.find((t) => t.key === tab)?.label}」のヒットはありません`}
        </p>
      ) : (
        <div className="divide-y divide-[#f0f0f0]">
          {filtered.map((hit) => <HitRow key={hit.id} hit={hit} onDismiss={dismiss} />)}
        </div>
      )}

      {/* Dismissed */}
      {dismissed.length > 0 && (
        <div>
          <button onClick={() => setShowDismissed((v) => !v)}
            className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors flex items-center gap-1">
            <span>{showDismissed ? "▲" : "▼"}</span>
            確認済み {dismissed.length}件
          </button>
          {showDismissed && (
            <div className="mt-3 divide-y divide-[#f0f0f0] opacity-40">
              {dismissed.map((hit) => (
                <div key={hit.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-[11px] text-[#6e6e73] w-16 shrink-0">{hit.source}</span>
                  <span className="text-[13px] text-[#6e6e73] truncate">{hit.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HitRow({ hit, onDismiss }: { hit: EgoHit; onDismiss: (id: string) => void }) {
  const eng = hit.engagement as Record<string, number> | null;

  return (
    <div className="py-5 flex items-start gap-4">
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Meta line */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#6e6e73]">
          <span className="font-medium text-[#1d1d1f]">{hit.source}</span>
          {hit.category && hit.category !== "other" && (
            <span>{hit.category === "buzz" ? "バズ" : "フィードバック"}</span>
          )}
          {hit.sentiment && (
            <span>{SENTIMENT_MARK[hit.sentiment]} {hit.sentiment === "positive" ? "ポジ" : hit.sentiment === "negative" ? "ネガ" : "中立"}</span>
          )}
          {hit.feedbackType && <span>{FEEDBACK_LABEL[hit.feedbackType] ?? hit.feedbackType}</span>}
          {hit.keyword && <span>#{hit.keyword}</span>}
          {hit.publishedAt && (
            <span>{new Date(hit.publishedAt).toLocaleDateString("ja-JP")}</span>
          )}
          {eng && (
            <>
              {eng.views    != null && <span>{eng.views.toLocaleString()} views</span>}
              {eng.likes    != null && <span>{eng.likes.toLocaleString()} likes</span>}
              {eng.reposts  != null && <span>{eng.reposts.toLocaleString()} RT</span>}
            </>
          )}
        </div>

        {/* Title */}
        <a href={hit.url} target="_blank" rel="noopener noreferrer"
          className="block text-[15px] font-medium text-[#1d1d1f] hover:text-[#0071e3] transition-colors leading-snug">
          {hit.title}
        </a>

        {hit.snippet && (
          <p className="text-[13px] text-[#6e6e73] line-clamp-2 leading-relaxed">{hit.snippet}</p>
        )}

        {hit.author && <p className="text-[11px] text-[#86868b]">{hit.author}</p>}
      </div>

      <button onClick={() => onDismiss(hit.id)}
        className="shrink-0 text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] px-3 py-1.5 rounded-xl hover:bg-[#f5f5f7] transition-all">
        確認済み
      </button>
    </div>
  );
}
