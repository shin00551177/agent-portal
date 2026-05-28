"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLATFORMS = [
  { value: "youtube",   label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "x",         label: "X (Twitter)" },
  { value: "facebook",  label: "Facebook" },
  { value: "threads",   label: "Threads" },
  { value: "tiktok",    label: "TikTok" },
];

const GENRES = [
  { value: "公式",     label: "公式",     desc: "ブランド公式アカウント向け" },
  { value: "エンタメ", label: "エンタメ", desc: "エンタメ・バラエティ系" },
  { value: "恋愛相談", label: "恋愛相談", desc: "恋愛・人間関係テーマ" },
  { value: "雑談",     label: "雑談",     desc: "日常会話・カジュアル" },
  { value: "人生相談", label: "人生相談", desc: "人生・悩み相談テーマ" },
];

const LANGUAGES = [
  { value: "ja", label: "日本語 (JP)" },
  { value: "en", label: "English (EN)" },
];

export function ContentGenerator({ appId }: { appId: string }) {
  const router = useRouter();
  const [platform, setPlatform] = useState("youtube");
  const [genre, setGenre] = useState("公式");
  const [count, setCount] = useState("3");
  const [language, setLanguage] = useState("ja");
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");

  const selectClass =
    "w-full px-3 py-2 bg-[#f5f5f7] rounded-lg text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="block text-[11px] text-[#6e6e73] mb-2">プラットフォーム</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={selectClass}>
            {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-[#6e6e73] mb-2">ジャンル</label>
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className={selectClass}>
            {GENRES.map((g) => <option key={g.value} value={g.value}>{g.label} — {g.desc}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-[#6e6e73] mb-2">言語</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectClass}>
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-[#6e6e73] mb-2">件数</label>
          <input
            type="number"
            min="1"
            max="10"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className={selectClass}
          />
        </div>
      </div>

      <button
        onClick={async () => {
          setState("running");
          const res = await fetch(`/api/sns/${appId}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform, genre, count, language }),
          });
          setState(res.ok ? "done" : "error");
          if (res.ok) {
            setTimeout(() => {
              setState("idle");
              router.push(`/sns/${appId}/drafts`);
            }, 1000);
          }
        }}
        disabled={state === "running"}
        className={`px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
          state === "running"
            ? "bg-[#f5f5f7] text-[#6e6e73] cursor-wait"
            : state === "done"
            ? "bg-[#f5f5f7] text-[#1d1d1f]"
            : state === "error"
            ? "bg-[#f5f5f7] text-red-500"
            : "bg-[#1d1d1f] hover:bg-black text-white"
        }`}
      >
        {state === "running" ? "生成中..." : state === "done" ? "完了" : state === "error" ? "エラー" : "生成する"}
      </button>
    </div>
  );
}
