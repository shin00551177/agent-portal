"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

type Draft = {
  id: string; platform: string; copy: string; hashtags: unknown;
  imagePrompt: string | null; notes: string | null; status: string; createdAt: Date;
  confidence: string; dataFreshness: Date | null;
};

const CONFIDENCE_LABEL: Record<string, { label: string; cls: string }> = {
  high:   { label: "確信度 高", cls: "bg-[#f0faf4] text-[#1d7a47]" },
  medium: { label: "確信度 中", cls: "bg-[#fff7e6] text-[#a05c00]" },
  low:    { label: "確信度 低", cls: "bg-[#fff1f0] text-[#c0392b]" },
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram",
  x: "X", facebook: "Facebook", threads: "Threads",
};

export function DraftList({ appId, initialDrafts }: { appId: string; initialDrafts: Draft[] }) {
  const [drafts, setDrafts] = useState(initialDrafts);

  async function updateStatus(id: string, status: "approved" | "rejected") {
    const res = await fetch(`/api/sns/${appId}/drafts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setDrafts((p) => p.map((d) => d.id === id ? { ...d, status } : d));
  }

  const pending = drafts.filter((d) => d.status === "pending");
  const done    = drafts.filter((d) => d.status !== "pending");

  if (drafts.length === 0) {
    return (
      <p className="text-[#6e6e73] text-[14px] py-12 text-center">下書きはまだありません</p>
    );
  }

  return (
    <div className="space-y-10">
      {pending.length > 0 && (
        <div>
          <p className="text-[13px] text-[#6e6e73] mb-4">レビュー待ち — {pending.length}件</p>
          <div className="divide-y divide-[#f0f0f0]">
            {pending.map((draft) => <DraftRow key={draft.id} draft={draft} onUpdate={updateStatus} />)}
          </div>
        </div>
      )}
      {done.length > 0 && (
        <div>
          <p className="text-[13px] text-[#6e6e73] mb-4">処理済み — {done.length}件</p>
          <div className="divide-y divide-[#f0f0f0] opacity-60">
            {done.map((draft) => <DraftRow key={draft.id} draft={draft} onUpdate={updateStatus} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function DraftRow({ draft, onUpdate }: { draft: Draft; onUpdate: (id: string, s: "approved" | "rejected") => void }) {
  const tags = Array.isArray(draft.hashtags) ? draft.hashtags as string[] : [];
  const isPending = draft.status === "pending";

  return (
    <div className="py-5 flex items-start gap-4">
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3 text-[12px] text-[#6e6e73]">
          <span className="font-medium text-[#1d1d1f]">{PLATFORM_LABEL[draft.platform] ?? draft.platform}</span>
          <span>
            {draft.status === "approved" ? "承認済み"
              : draft.status === "rejected" ? "却下"
              : "レビュー待ち"}
          </span>
          {/* Confidence badge (#11) */}
          {(() => {
            const c = CONFIDENCE_LABEL[draft.confidence] ?? CONFIDENCE_LABEL.medium;
            return (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${c.cls}`}>
                {c.label}
              </span>
            );
          })()}
          {draft.dataFreshness && (
            <span className="text-[11px] text-[#86868b]">
              情報鮮度: {new Date(draft.dataFreshness).toLocaleDateString("ja-JP")}
            </span>
          )}
        </div>

        {/* Copy */}
        <p className="text-[15px] text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">{draft.copy}</p>

        {tags.length > 0 && (
          <p className="text-[13px] text-[#0071e3]">{tags.map((t) => `#${t}`).join(" ")}</p>
        )}
        {draft.imagePrompt && (
          <p className="text-[12px] text-[#6e6e73] bg-[#f5f5f7] px-3 py-2 rounded-xl">
            画像プロンプト: {draft.imagePrompt}
          </p>
        )}
        {draft.notes && <p className="text-[12px] text-[#6e6e73]">{draft.notes}</p>}
      </div>

      {isPending && (
        <div className="flex flex-col gap-2 shrink-0">
          <Button size="sm" onClick={() => onUpdate(draft.id, "approved")}>承認</Button>
          <Button size="sm" variant="secondary" onClick={() => onUpdate(draft.id, "rejected")}>却下</Button>
        </div>
      )}
    </div>
  );
}
