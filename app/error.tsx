"use client";

import { useEffect } from "react";
import { NavShell } from "@/components/NavShell";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <NavShell>
      <div className="flex flex-col items-start py-20">
        <p className="text-[13px] text-[#86868b] mb-4">500</p>
        <h1 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight leading-tight mb-4">
          エラーが発生しました
        </h1>
        <p className="text-[17px] text-[#6e6e73] mb-2">
          予期しないエラーが発生しました。
        </p>
        {error.digest && (
          <p className="text-[13px] text-[#86868b] mb-10 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#1d1d1f] hover:bg-black text-white rounded-xl text-[15px] font-medium transition-colors"
        >
          再試行
        </button>
      </div>
    </NavShell>
  );
}
