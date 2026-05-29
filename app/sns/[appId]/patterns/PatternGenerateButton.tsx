"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

export function PatternGenerateButton({ appId, disabled }: { appId: string; disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const id = appId || (params.appId as string);

  async function generate() {
    setLoading(true);
    const res = await fetch(`/api/sns/${id}/patterns/generate`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      alert(data.error ?? "生成に失敗しました");
    }
  }

  return (
    <button
      onClick={generate}
      disabled={disabled || loading}
      className="px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-[13px] font-medium hover:bg-black disabled:opacity-40 transition-colors"
    >
      {loading ? "生成中..." : "パターンを生成"}
    </button>
  );
}
