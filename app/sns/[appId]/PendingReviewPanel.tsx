"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

type Draft = {
  id: string;
  platform: string;
  copy: string;
  hashtags: unknown;
  imagePrompt: string | null;
  imageUrl: string | null;
  imageStatus: string | null;
  confidence: string;
  createdAt: Date;
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube", x: "X", threads: "Threads",
  instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok",
};

const CONFIDENCE_CLS: Record<string, string> = {
  high:   "bg-[#f0faf4] text-[#1d7a47]",
  medium: "bg-[#fff7e6] text-[#a05c00]",
  low:    "bg-[#fff1f0] text-[#c0392b]",
};

type RejectMode = "idle" | "input" | "regenerating";

export function PendingReviewPanel({
  appId,
  initialDrafts,
}: {
  appId: string;
  initialDrafts: Draft[];
}) {
  const [drafts, setDrafts]         = useState(initialDrafts);
  const [busy, setBusy]             = useState<Record<string, boolean>>({});
  const [rejectMode, setRejectMode] = useState<Record<string, RejectMode>>({});
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  // ── Approve ────────────────────────────────────────
  async function approve(id: string) {
    setBusy((p) => ({ ...p, [id]: true }));
    const res = await fetch(`/api/sns/${appId}/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (res.ok) setDrafts((p) => p.filter((d) => d.id !== id));
    setBusy((p) => ({ ...p, [id]: false }));
  }

  // ── Reject only (discard) ───────────────────────────
  async function rejectOnly(id: string) {
    setBusy((p) => ({ ...p, [id]: true }));
    const res = await fetch(`/api/sns/${appId}/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (res.ok) {
      setDrafts((p) => p.filter((d) => d.id !== id));
      setRejectMode((p) => { const n = {...p}; delete n[id]; return n; });
    }
    setBusy((p) => ({ ...p, [id]: false }));
  }

  // ── Regenerate with improvement notes ──────────────
  async function regenerate(id: string) {
    const notes = rejectNotes[id]?.trim();
    if (!notes) return;
    setRejectMode((p) => ({ ...p, [id]: "regenerating" }));
    const res = await fetch(`/api/sns/${appId}/drafts/${id}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ improvementNotes: notes }),
    });
    if (res.ok) {
      const { draft } = await res.json();
      setDrafts((p) => [
        draft,
        ...p.filter((d) => d.id !== id),
      ]);
      setRejectMode((p) => { const n = {...p}; delete n[id]; return n; });
      setRejectNotes((p) => { const n = {...p}; delete n[id]; return n; });
    } else {
      setRejectMode((p) => ({ ...p, [id]: "input" }));
    }
  }

  async function approveAll() {
    await Promise.all(drafts.map((d) => approve(d.id)));
  }

  if (drafts.length === 0) {
    return (
      <p className="text-[13px] text-[#6e6e73] py-6 text-center">
        承認待ちの提案はありません
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk action */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#6e6e73]">{drafts.length}件</p>
        <Button size="sm" onClick={approveAll}>全て承認</Button>
      </div>

      {/* Cards */}
      <div className="divide-y divide-[#f0f0f0]">
        {drafts.map((draft) => {
          const tags    = Array.isArray(draft.hashtags) ? draft.hashtags as string[] : [];
          const confCls = CONFIDENCE_CLS[draft.confidence] ?? CONFIDENCE_CLS.medium;
          const confLabel = draft.confidence === "high" ? "確信度 高"
            : draft.confidence === "low" ? "確信度 低" : "確信度 中";
          const mode = rejectMode[draft.id] ?? "idle";

          return (
            <div key={draft.id} className="py-5 space-y-3">
              {/* Content */}
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Meta */}
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="font-medium text-[#1d1d1f] text-[13px]">
                      {PLATFORM_LABEL[draft.platform] ?? draft.platform}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${confCls}`}>
                      {confLabel}
                    </span>
                    <span className="text-[#86868b]">
                      {new Date(draft.createdAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>

                  {/* Copy */}
                  <p className="text-[14px] text-[#1d1d1f] leading-relaxed whitespace-pre-wrap">
                    {draft.copy}
                  </p>

                  {tags.length > 0 && (
                    <p className="text-[12px] text-[#0071e3]">
                      {tags.map((t) => `#${t}`).join(" ")}
                    </p>
                  )}

                  {/* 画像 */}
                  {draft.imageStatus === "generating" && (
                    <div className="flex items-center gap-2 text-[11px] text-[#6e6e73]">
                      <span className="w-3 h-3 border-2 border-[#c7c7cc] border-t-[#0071e3] rounded-full animate-spin" />
                      画像生成中...
                    </div>
                  )}
                  {draft.imageStatus === "done" && draft.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-[#f0f0f0]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.imageUrl} alt="生成画像" className="w-full max-h-48 object-cover" />
                    </div>
                  )}
                  {draft.imageStatus === "error" && (
                    <p className="text-[11px] text-red-400 bg-red-50 px-3 py-1.5 rounded-xl">
                      画像生成失敗 — {draft.imagePrompt}
                    </p>
                  )}
                </div>

                {/* Action buttons (idle mode) */}
                {mode === "idle" && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" disabled={busy[draft.id]} onClick={() => approve(draft.id)}>
                      承認
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy[draft.id]}
                      onClick={() => setRejectMode((p) => ({ ...p, [draft.id]: "input" }))}
                    >
                      却下
                    </Button>
                  </div>
                )}

                {/* Regenerating spinner */}
                {mode === "regenerating" && (
                  <div className="flex items-center gap-2 text-[12px] text-[#6e6e73] shrink-0 pt-1">
                    <span className="w-4 h-4 border-2 border-[#c7c7cc] border-t-[#0071e3] rounded-full animate-spin" />
                    再生成中...
                  </div>
                )}
              </div>

              {/* Rejection improvement form */}
              {mode === "input" && (
                <div className="ml-0 bg-[#fff7e6] border border-[#f5d89a] rounded-2xl p-4 space-y-3">
                  <p className="text-[13px] font-medium text-[#1d1d1f]">
                    どう改善しますか？
                  </p>
                  <textarea
                    autoFocus
                    rows={2}
                    value={rejectNotes[draft.id] ?? ""}
                    onChange={(e) =>
                      setRejectNotes((p) => ({ ...p, [draft.id]: e.target.value }))
                    }
                    placeholder="例: もっとカジュアルに　/　英語で　/　短く140字以内　/　ハッシュタグ多め　/　恋愛テーマを前面に"
                    className="w-full px-3 py-2 bg-white rounded-xl text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#f0a500] resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={!rejectNotes[draft.id]?.trim()}
                      onClick={() => regenerate(draft.id)}
                    >
                      この内容で再生成
                    </Button>
                    <button
                      onClick={() => rejectOnly(draft.id)}
                      className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors px-2"
                    >
                      破棄のみ
                    </button>
                    <button
                      onClick={() => {
                        setRejectMode((p) => { const n = {...p}; delete n[draft.id]; return n; });
                        setRejectNotes((p) => { const n = {...p}; delete n[draft.id]; return n; });
                      }}
                      className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors px-2"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
