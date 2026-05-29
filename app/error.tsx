"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  function handleRetry() {
    router.refresh(); // サーバーコンポーネントを再フェッチ
    reset();          // エラーバウンダリをクリア
  }

  return (
    <div className="min-h-screen bg-white flex items-start">
      <div className="max-w-[980px] mx-auto px-5 py-20">
        <p className="text-[13px] text-[#86868b] mb-4">500</p>
        <h1 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight leading-tight mb-4">
          エラーが発生しました
        </h1>
        <p className="text-[17px] text-[#6e6e73] mb-2">予期しないエラーが発生しました。</p>
        {error.digest && (
          <p className="text-[13px] text-[#86868b] mb-10 font-mono">Error ID: {error.digest}</p>
        )}
        <Button size="lg" onClick={handleRetry}>再試行</Button>
      </div>
    </div>
  );
}
