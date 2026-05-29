"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefAnalyzeButton({ appId, refId }: { appId: string; refId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function analyze() {
    setLoading(true);
    await fetch(`/api/sns/${appId}/refs/${refId}/analyze`, { method: "POST" });
    router.refresh();
  }

  return (
    <button
      onClick={analyze}
      disabled={loading}
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition-colors"
    >
      {loading ? "分析中..." : "分析する"}
    </button>
  );
}
