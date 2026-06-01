"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSnsLocale } from "../LocaleContext";

type ProductFeedback = {
  id: string;
  source: string;
  type: string;
  content: string;
  url: string | null;
  author: string | null;
  importance: string;
  processed: boolean;
  createdAt: string;
};

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  bug:             { label: "バグ",     cls: "bg-red-50 text-red-600 border-red-200" },
  feature_request: { label: "要望",     cls: "bg-blue-50 text-blue-600 border-blue-200" },
  praise:          { label: "称賛",     cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  comparison:      { label: "比較",     cls: "bg-purple-50 text-purple-600 border-purple-200" },
  general:         { label: "その他",   cls: "bg-gray-50 text-gray-500 border-gray-200" },
};

const IMPORTANCE_LABEL: Record<string, string> = {
  high:   "🔴 高",
  medium: "🟡 中",
  low:    "⚪ 低",
};

export default function FeedbackPage() {
  const { t } = useSnsLocale();

  const { appId } = useParams<{ appId: string }>();
  const [feedbacks, setFeedbacks] = useState<ProductFeedback[]>([]);
  const [showProcessed, setShowProcessed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ source: "appstore", type: "bug", content: "", importance: "medium", url: "", author: "" });

  async function load() {
    const res = await fetch(`/api/sns/${appId}/product-feedback?processed=${showProcessed}`);
    if (res.ok) setFeedbacks(await res.json());
  }
  useEffect(() => { load(); }, [appId, showProcessed]);

  async function markProcessed(id: string) {
    await fetch(`/api/sns/${appId}/product-feedback`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, processed: true }),
    });
    await load();
  }

  async function addFeedback() {
    if (!form.content.trim()) return;
    await fetch(`/api/sns/${appId}/product-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, url: form.url || null, author: form.author || null }),
    });
    setForm({ source: "appstore", type: "bug", content: "", importance: "medium", url: "", author: "" });
    setAdding(false);
    await load();
  }

  const unprocessedCount = feedbacks.filter((f) => !f.processed).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">ユーザーFB</h2>
          <p className="text-[13px] text-[#6e6e73] mt-1">
            アプリレビュー・SNS言及から収集したユーザーフィードバック
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowProcessed(!showProcessed)}
            className={`px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${
              showProcessed ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#6e6e73]"
            }`}
          >
            {showProcessed ? t.feedback.showProcessed : t.feedback.unprocessedOnly}
          </button>
          <button
            onClick={() => setAdding(!adding)}
            className="px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-[13px] font-medium"
          >
            + 手動追加
          </button>
        </div>
      </div>

      {/* 手動追加フォーム */}
      {adding && (
        <div className="rounded-2xl border border-[#f0f0f0] p-5 space-y-3">
          <p className="text-[13px] font-semibold text-[#1d1d1f]">フィードバックを追加</p>
          <div className="grid grid-cols-3 gap-3">
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="px-3 py-2 bg-[#f5f5f7] rounded-xl text-[12px] focus:outline-none">
              {["appstore", "playstore", "x", "instagram", "tiktok", "その他"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="px-3 py-2 bg-[#f5f5f7] rounded-xl text-[12px] focus:outline-none">
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={form.importance} onChange={(e) => setForm({ ...form, importance: e.target.value })}
              className="px-3 py-2 bg-[#f5f5f7] rounded-xl text-[12px] focus:outline-none">
              {[["high", "高"], ["medium", "中"], ["low", "低"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="フィードバック内容" rows={3}
            className="w-full px-3 py-2.5 border border-[#d2d2d7] rounded-xl text-[13px] resize-none focus:outline-none focus:border-[#1d1d1f]" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder="投稿者（任意）"
              className="px-3 py-2 border border-[#d2d2d7] rounded-xl text-[12px] focus:outline-none" />
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="URL（任意）"
              className="px-3 py-2 border border-[#d2d2d7] rounded-xl text-[12px] focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={addFeedback} disabled={!form.content.trim()}
              className="flex-1 py-2.5 rounded-xl bg-[#1d1d1f] text-white text-[13px] font-medium disabled:opacity-40">
              追加
            </button>
            <button onClick={() => setAdding(false)}
              className="px-4 py-2.5 rounded-xl bg-[#f5f5f7] text-[#6e6e73] text-[13px]">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {feedbacks.length === 0 ? (
        <div className="py-16 rounded-2xl border border-dashed border-[#d2d2d7] text-center">
          <p className="text-[14px] text-[#6e6e73]">フィードバックがありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {feedbacks.map((fb) => {
            const typeInfo = TYPE_LABEL[fb.type] ?? TYPE_LABEL.general;
            return (
              <div key={fb.id} className={`rounded-2xl border p-4 space-y-2 ${fb.processed ? "opacity-50" : "border-[#f0f0f0]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-[#86868b] capitalize">{fb.source}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeInfo.cls}`}>
                      {typeInfo.label}
                    </span>
                    <span className="text-[11px] text-[#86868b]">{IMPORTANCE_LABEL[fb.importance]}</span>
                    {fb.author && <span className="text-[11px] text-[#86868b]">@{fb.author}</span>}
                  </div>
                  {!fb.processed && (
                    <button
                      onClick={() => markProcessed(fb.id)}
                      className="flex-shrink-0 text-[11px] text-[#86868b] hover:text-[#1d1d1f] border border-[#d2d2d7] px-2 py-1 rounded-lg transition-colors"
                    >
                      対応済み
                    </button>
                  )}
                </div>
                <p className="text-[13px] text-[#1d1d1f] leading-relaxed">{fb.content}</p>
                {fb.url && (
                  <a href={fb.url} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-[#079147] hover:underline">
                    元のURL →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
