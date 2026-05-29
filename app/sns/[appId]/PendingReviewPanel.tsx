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

export function PendingReviewPanel({
  appId,
  initialDrafts,
}: {
  appId: string;
  initialDrafts: Draft[];
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  async function updateOne(id: string, status: "approved" | "rejected") {
    setBusy((p) => ({ ...p, [id]: true }));
    const res = await fetch(`/api/sns/${appId}/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setDrafts((p) => p.filter((d) => d.id !== id));
    setBusy((p) => ({ ...p, [id]: false }));
  }

  async function updateAll(status: "approved" | "rejected") {
    await Promise.all(drafts.map((d) => updateOne(d.id, status)));
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
      {/* Bulk actions */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#6e6e73]">{drafts.length}件</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => updateAll("approved")}>全て承認</Button>
          <Button size="sm" variant="secondary" onClick={() => updateAll("rejected")}>全て却下</Button>
        </div>
      </div>

      {/* Cards */}
      <div className="divide-y divide-[#f0f0f0]">
        {drafts.map((draft) => {
          const tags = Array.isArray(draft.hashtags) ? draft.hashtags as string[] : [];
          const confCls = CONFIDENCE_CLS[draft.confidence] ?? CONFIDENCE_CLS.medium;
          const confLabel = draft.confidence === "high" ? "確信度 高" : draft.confidence === "low" ? "確信度 低" : "確信度 中";

          return (
            <div key={draft.id} className="py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0 space-y-2">
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
                    <img
                      src={draft.imageUrl}
                      alt="生成画像"
                      className="w-full max-h-48 object-cover"
                    />
                  </div>
                )}
                {draft.imageStatus === "error" && (
                  <p className="text-[11px] text-red-400 bg-red-50 px-3 py-1.5 rounded-xl">
                    画像生成失敗 — プロンプト: {draft.imagePrompt}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Button
                  size="sm"
                  disabled={busy[draft.id]}
                  onClick={() => updateOne(draft.id, "approved")}
                >
                  承認
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy[draft.id]}
                  onClick={() => updateOne(draft.id, "rejected")}
                >
                  却下
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
