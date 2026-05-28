"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

export function SyncButton({ appId }: { appId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [showRange, setShowRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function sync(body?: { startDate?: string; endDate?: string }) {
    setState("syncing");
    try {
      const res = await fetch(`/api/aso/${appId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
        credentials: "include",
      });
      setState(res.ok ? "done" : "error");
      if (res.ok) {
        setTimeout(() => { setState("idle"); router.refresh(); }, 1500);
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* 通常更新ボタン */}
      <Button
        variant={state === "error" ? "danger" : state === "done" ? "secondary" : "primary"}
        size="sm"
        disabled={state === "syncing"}
        onClick={() => sync()}
      >
        {state === "syncing" ? "取得中..." : state === "done" ? "完了 ✓" : state === "error" ? "エラー" : "データ更新"}
      </Button>

      {/* 期間指定クエリ */}
      <button
        onClick={() => setShowRange((v) => !v)}
        className="text-[12px] text-[#0071e3] hover:underline"
        disabled={state === "syncing"}
      >
        {showRange ? "▲ 閉じる" : "期間指定 ›"}
      </button>

      {showRange && (
        <div className="flex items-center gap-2 bg-[#f5f5f7] rounded-xl px-3 py-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white border border-[#d2d2d7] rounded-lg px-2 py-1 text-[12px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
          <span className="text-[12px] text-[#6e6e73]">〜</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="bg-white border border-[#d2d2d7] rounded-lg px-2 py-1 text-[12px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={!startDate || state === "syncing"}
            onClick={() => sync({ startDate, endDate })}
          >
            この期間を取得
          </Button>
        </div>
      )}
    </div>
  );
}
