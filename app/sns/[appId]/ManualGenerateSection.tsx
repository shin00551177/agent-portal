"use client";

import { useState } from "react";
import { ContentGenerator } from "./ContentGenerator";

export function ManualGenerateSection({ appId }: { appId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[#f0f0f0] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#f9f9f9] transition-colors"
      >
        <div>
          <p className="text-[15px] font-medium text-[#1d1d1f]">手動で追加生成</p>
          <p className="text-[12px] text-[#6e6e73] mt-0.5">
            自動生成とは別に、特定のプラットフォーム・ジャンルで投稿案を追加作成します
          </p>
        </div>
        <span className="text-[#6e6e73] text-[20px] font-light transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
          ›
        </span>
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 border-t border-[#f0f0f0]">
          <ContentGenerator appId={appId} />
        </div>
      )}
    </div>
  );
}
