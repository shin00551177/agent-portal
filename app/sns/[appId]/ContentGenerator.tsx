"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

// ── Platform definitions ────────────────────────────────
// apiReady = false → posting API not yet connected (content generation still works)
const PLATFORMS = [
  { value: "youtube",   label: "YouTube",     apiReady: true  },
  { value: "x",         label: "X (Twitter)", apiReady: true  },
  { value: "threads",   label: "Threads",     apiReady: true  },
  { value: "instagram", label: "Instagram",   apiReady: false, reason: "Meta API 未設定" },
  { value: "facebook",  label: "Facebook",    apiReady: false, reason: "Meta API 未設定" },
  { value: "tiktok",    label: "TikTok",      apiReady: false, reason: "TikTok API 未設定" },
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

const CONFIDENCE_LABEL: Record<string, { label: string; cls: string }> = {
  high:   { label: "確信度 高", cls: "bg-[#f0faf4] text-[#1d7a47]" },
  medium: { label: "確信度 中", cls: "bg-[#fff7e6] text-[#a05c00]" },
  low:    { label: "確信度 低", cls: "bg-[#fff1f0] text-[#c0392b]" },
};

type DraftPreview = {
  platform: string;
  copy: string;
  hashtags: string[];
  imagePrompt: string | null;
  notes: string | null;
  confidence: string;
  imageUrl?: string | null;
  imageLoading?: boolean;
};

type Stage = "idle" | "generating" | "previewing" | "saving" | "saved" | "error";

export function ContentGenerator({ appId }: { appId: string }) {
  const router = useRouter();

  // ── Form state ──
  const [platform, setPlatform] = useState("youtube");
  const [genre, setGenre]       = useState("公式");
  const [count, setCount]       = useState("3");
  const [language, setLanguage] = useState("ja");

  // ── Workflow state ──
  const [stage, setStage]       = useState<Stage>("idle");
  const [previews, setPreviews] = useState<DraftPreview[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [errorMsg, setErrorMsg] = useState("");

  const selectCls =
    "w-full px-3 py-2 bg-[#f5f5f7] rounded-lg text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]";

  const currentPlatform = PLATFORMS.find((p) => p.value === platform);

  // ── Step 1: generate (preview mode — no DB write yet) ──
  async function generate() {
    setStage("generating");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/sns/${appId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, genre, count, language, preview: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { items } = await res.json();
      // プレビューをすぐ表示（画像はloading状態で開始）
      const withLoading = items.map((item: DraftPreview) => ({
        ...item,
        imageUrl: null,
        imageLoading: !!item.imagePrompt,
      }));
      setPreviews(withLoading);
      setSelected(new Set(items.map((_: unknown, i: number) => i)));
      setStage("previewing");

      // 画像を並行生成してカードを随時更新
      items.forEach((item: DraftPreview, i: number) => {
        if (!item.imagePrompt) return;
        fetch(`/api/sns/${appId}/preview-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagePrompt: item.imagePrompt, platform: item.platform }),
        })
          .then((r) => r.json())
          .then((data) => {
            setPreviews((prev) => {
              const next = [...prev];
              next[i] = { ...next[i], imageUrl: data.url ?? null, imageLoading: false };
              return next;
            });
          })
          .catch(() => {
            setPreviews((prev) => {
              const next = [...prev];
              next[i] = { ...next[i], imageLoading: false };
              return next;
            });
          });
      });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "生成エラー");
      setStage("error");
      setTimeout(() => setStage("idle"), 4000);
    }
  }

  // ── Step 2: save selected drafts ──
  async function saveSelected() {
    const toSave = previews.filter((_, i) => selected.has(i));
    if (toSave.length === 0) {
      reset();
      return;
    }
    setStage("saving");
    const res = await fetch(`/api/sns/${appId}/drafts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: toSave }),
    });
    if (res.ok) {
      setStage("saved");
      setTimeout(() => {
        reset();
        router.push(`/sns/${appId}/drafts`);
      }, 1200);
    } else {
      setStage("error");
      setErrorMsg("保存に失敗しました");
      setTimeout(() => setStage("previewing"), 3000);
    }
  }

  function reset() {
    setPreviews([]);
    setSelected(new Set());
    setStage("idle");
  }

  function toggleItem(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  // ── Render ──
  return (
    <div className="space-y-6">

      {/* ── Form (always shown) ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Platform */}
        <div>
          <label className="block text-[11px] text-[#6e6e73] mb-2">プラットフォーム</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            disabled={stage !== "idle"}
            className={selectCls}
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}{!p.apiReady ? " ⚠" : ""}
              </option>
            ))}
          </select>
          {/* API status badge */}
          {currentPlatform && !currentPlatform.apiReady && (
            <p className="mt-1.5 text-[11px] text-[#a05c00] bg-[#fff7e6] rounded-lg px-2 py-1 leading-snug">
              ⚠ {currentPlatform.reason}。生成は可能ですが自動投稿は未対応です。
            </p>
          )}
        </div>

        {/* Genre */}
        <div>
          <label className="block text-[11px] text-[#6e6e73] mb-2">ジャンル</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            disabled={stage !== "idle"}
            className={selectCls}
          >
            {GENRES.map((g) => (
              <option key={g.value} value={g.value}>{g.label} — {g.desc}</option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-[11px] text-[#6e6e73] mb-2">言語</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={stage !== "idle"}
            className={selectCls}
          >
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>

        {/* Count */}
        <div>
          <label className="block text-[11px] text-[#6e6e73] mb-2">件数</label>
          <input
            type="number" min="1" max="10"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            disabled={stage !== "idle"}
            className={selectCls}
          />
        </div>
      </div>

      {/* ── Generate button (idle / error only) ── */}
      {(stage === "idle" || stage === "generating" || stage === "error") && (
        <div className="flex items-center gap-3">
          <Button
            variant={stage === "error" ? "danger" : "primary"}
            disabled={stage === "generating"}
            onClick={generate}
          >
            {stage === "generating" ? "生成中..." : stage === "error" ? errorMsg || "エラー" : "生成する"}
          </Button>
          {stage === "idle" && (
            <p className="text-[12px] text-[#86868b]">
              生成後、内容を確認してから保存します（行動規範 原則6）
            </p>
          )}
        </div>
      )}

      {/* ── Preview panel (previewing / saving / saved) ── */}
      {(stage === "previewing" || stage === "saving" || stage === "saved") && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-[#1d1d1f]">
              生成結果 — 保存する内容を選択してください
              <span className="ml-2 text-[12px] font-normal text-[#6e6e73]">
                ({selected.size}/{previews.length}件選択中)
              </span>
            </p>
            <button
              onClick={reset}
              className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
            >
              キャンセル
            </button>
          </div>

          {/* Draft cards */}
          <div className="space-y-3">
            {previews.map((draft, i) => {
              const conf = CONFIDENCE_LABEL[draft.confidence] ?? CONFIDENCE_LABEL.medium;
              const isSelected = selected.has(i);
              return (
                <div
                  key={i}
                  onClick={() => toggleItem(i)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? "border-[#1d1d1f] bg-white"
                      : "border-[#f0f0f0] bg-[#f5f5f7] opacity-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Meta row */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#6e6e73]">
                        <span className="font-medium text-[#1d1d1f]">
                          {PLATFORMS.find((p) => p.value === draft.platform)?.label ?? draft.platform}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-medium ${conf.cls}`}>
                          {conf.label}
                        </span>
                        <span className="text-[#86868b]">
                          情報鮮度: {new Date().toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                      {/* Copy */}
                      <p className="text-[14px] text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">
                        {draft.copy}
                      </p>
                      {draft.hashtags.length > 0 && (
                        <p className="text-[12px] text-[#0071e3]">
                          {draft.hashtags.map((t) => `#${t}`).join(" ")}
                        </p>
                      )}
                      {/* 画像プレビュー */}
                      {draft.imageLoading && (
                        <div className="w-full h-36 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
                          <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                            画像生成中...
                          </div>
                        </div>
                      )}
                      {draft.imageUrl && !draft.imageLoading && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={draft.imageUrl}
                          alt="生成画像"
                          className="w-full rounded-xl object-cover max-h-64"
                        />
                      )}
                      {!draft.imageUrl && !draft.imageLoading && draft.imagePrompt && (
                        <p className="text-[11px] text-[#6e6e73] bg-[#f5f5f7] px-3 py-1.5 rounded-xl">
                          画像プロンプト: {draft.imagePrompt}
                        </p>
                      )}
                      {draft.notes && (
                        <p className="text-[11px] text-[#6e6e73]">{draft.notes}</p>
                      )}
                    </div>
                    {/* Checkbox */}
                    <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? "border-[#1d1d1f] bg-[#1d1d1f]" : "border-[#c7c7cc] bg-white"
                    }`}>
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save / discard actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="primary"
              disabled={stage === "saving" || stage === "saved" || selected.size === 0}
              onClick={saveSelected}
            >
              {stage === "saved"
                ? "保存しました ✓"
                : stage === "saving"
                ? "保存中..."
                : `選択した ${selected.size} 件を保存`}
            </Button>
            <Button variant="secondary" onClick={reset} disabled={stage === "saving"}>
              全て捨てる
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
