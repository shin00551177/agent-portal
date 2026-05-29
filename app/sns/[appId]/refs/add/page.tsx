"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Step = "idle" | "fetching" | "preview" | "saving" | "analyzing" | "done" | "error";

type Meta = {
  account: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  duration: number;
  postedDate: string;
  hashtags: string;
  bgm: string;
  platform: string;
  thumbnail: string;
};

export default function AddRefPage() {
  const { appId } = useParams<{ appId: string }>();
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchMeta() {
    if (!url.trim()) return;
    setStep("fetching");
    setError(null);
    setMeta(null);

    const res = await fetch(`/api/sns/${appId}/refs/fetch-meta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "取得失敗");
      setStep("error");
      return;
    }
    setMeta(data);
    setStep("preview");
  }

  async function saveAndAnalyze() {
    if (!meta) return;
    setStep("saving");
    setError(null);

    const res = await fetch(`/api/sns/${appId}/refs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, ...meta }),
    });
    const saved = await res.json();
    if (!res.ok) {
      setError(saved.error ?? "保存失敗");
      setStep("error");
      return;
    }

    setStep("analyzing");
    await fetch(`/api/sns/${appId}/refs/${saved.id}/analyze`, { method: "POST" });

    setStep("done");
    setTimeout(() => router.push(`/sns/${appId}/refs`), 1200);
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <Link href={`/sns/${appId}/refs`} className="text-[13px] text-[#0071e3] hover:underline">
          ← レファランス一覧
        </Link>
        <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight mt-3">
          動画を追加
        </h2>
        <p className="text-[13px] text-[#6e6e73] mt-1">
          TikTok・Instagram・YouTubeのURLを入力してください
        </p>
      </div>

      {/* URL入力 */}
      <div className="space-y-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@..."
          className="w-full px-4 py-3 rounded-xl border border-[#d2d2d7] text-[14px] focus:outline-none focus:border-[#0071e3] transition-colors"
          disabled={["fetching", "saving", "analyzing"].includes(step)}
        />
        <button
          onClick={fetchMeta}
          disabled={!url.trim() || ["fetching", "saving", "analyzing"].includes(step)}
          className="w-full py-3 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] disabled:opacity-40 transition-colors"
        >
          {step === "fetching" ? "メタデータ取得中..." : "メタデータを取得"}
        </button>
      </div>

      {/* エラー */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      {/* プレビュー */}
      {meta && (["preview", "saving", "analyzing"] as Step[]).includes(step) && (
        <div className="rounded-2xl border border-[#f0f0f0] divide-y divide-[#f0f0f0]">
          {meta.thumbnail && (
            <div className="p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={meta.thumbnail} alt="" className="w-full rounded-xl object-cover max-h-48" />
            </div>
          )}
          <div className="p-4 space-y-2">
            {[
              ["プラットフォーム", meta.platform],
              ["アカウント", meta.account],
              ["タイトル", meta.title],
              ["再生数", meta.views?.toLocaleString()],
              ["いいね", meta.likes?.toLocaleString()],
              ["時間", meta.duration ? `${meta.duration}秒` : "—"],
              ["投稿日", meta.postedDate],
              ["ハッシュタグ", meta.hashtags],
              ["BGM", meta.bgm],
            ].map(([label, val]) =>
              val ? (
                <div key={label} className="flex gap-3 text-[13px]">
                  <span className="text-[#86868b] w-24 flex-shrink-0">{label}</span>
                  <span className="text-[#1d1d1f] break-all">{val}</span>
                </div>
              ) : null
            )}
          </div>
          <div className="p-4">
            <button
              onClick={saveAndAnalyze}
              disabled={["saving", "analyzing"].includes(step)}
              className="w-full py-3 rounded-xl bg-[#1d1d1f] text-white text-[14px] font-medium hover:bg-black disabled:opacity-40 transition-colors"
            >
              {step === "saving" ? "保存中..." : step === "analyzing" ? "AI分析中..." : "保存してAI分析を開始"}
            </button>
          </div>
        </div>
      )}

      {/* 完了 */}
      {step === "done" && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-[14px] font-medium text-emerald-700">
          分析完了。レファランス一覧に戻ります...
        </div>
      )}
    </div>
  );
}
