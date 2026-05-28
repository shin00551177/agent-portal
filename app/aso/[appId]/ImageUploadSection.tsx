"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/Button";

const IMAGE_TYPES = {
  android: [
    { value: "featureGraphic",       label: "フィーチャーグラフィック", hint: "1024×500px" },
    { value: "phoneScreenshots",     label: "スクリーンショット (Phone)", hint: "最大8枚" },
    { value: "icon",                 label: "アイコン",                  hint: "512×512px" },
  ],
  ios: [
    { value: "APP_IPHONE_65",        label: "iPhone スクリーンショット (6.5\")", hint: "1284×2778px" },
    { value: "APP_IPHONE_61",        label: "iPhone スクリーンショット (6.1\")", hint: "1170×2532px" },
    { value: "APP_IPAD_PRO_3GEN_129",label: "iPad Pro スクリーンショット",        hint: "2048×2732px" },
  ],
} as const;

type Platform = keyof typeof IMAGE_TYPES;

export function ImageUploadSection({
  appId,
  hasIos,
  hasAndroid,
}: {
  appId: string;
  hasIos: boolean;
  hasAndroid: boolean;
}) {
  const [platform, setPlatform] = useState<Platform>(hasAndroid ? "android" : "ios");
  const [imageType, setImageType] = useState<string>(IMAGE_TYPES[platform][0].value);
  const [language, setLanguage] = useState("ja");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);  // デフォルトはドライラン（安全優先）
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error" | "waiting">("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function onPlatformChange(p: Platform) {
    setPlatform(p);
    setImageType(IMAGE_TYPES[p][0].value);
    setFile(null);
    setPreview(null);
    setState("idle");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setState("idle");
  }

  async function upload() {
    if (!file) return;
    setState("uploading");
    setMessage("");

    const form = new FormData();
    form.append("file", file);
    form.append("platform", platform);
    form.append("imageType", imageType);
    form.append("language", language);
    form.append("dryRun", String(dryRun));

    try {
      const res = await fetch(`/api/aso/${appId}/upload-image`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const json = await res.json();

      if (res.ok) {
        setState("done");
        setMessage(json.dryRun ? "ドライラン完了 ✓（審査には未提出）" : "アップロード完了 ✓（審査に提出されました）");
        setFile(null);
        setPreview(null);
      } else if (json.waitingForVersion) {
        setState("waiting");
        setMessage("⏳ 編集可能なバージョンがありません。VNチームが新バージョンを作成後に再試行してください。");
      } else {
        setState("error");
        setMessage(json.error ?? "エラーが発生しました");
      }
    } catch {
      setState("error");
      setMessage("通信エラーが発生しました");
    }
  }

  const types = IMAGE_TYPES[platform];

  return (
    <div className="space-y-5">
      {/* Beta badge */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#fff7e6] text-[#a05c00]">β ベータ</span>
        <p className="text-[12px] text-[#86868b]">画像はアップロード後すぐにストアに反映されます</p>
      </div>

      {/* Platform + language */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-[#f5f5f7] rounded-xl p-1">
          {hasAndroid && (
            <button onClick={() => onPlatformChange("android")}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all ${platform === "android" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73]"}`}>
              Android
            </button>
          )}
          {hasIos && (
            <button onClick={() => onPlatformChange("ios")}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all ${platform === "ios" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73]"}`}>
              iOS
            </button>
          )}
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-3 py-1.5 bg-[#f5f5f7] rounded-lg text-[13px] text-[#1d1d1f] focus:outline-none"
        >
          <option value="ja">日本語 (ja)</option>
          <option value="en">English (en)</option>
        </select>
      </div>

      {/* Image type */}
      <div className="grid grid-cols-3 gap-2">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => setImageType(t.value)}
            className={`px-4 py-3 rounded-xl text-left border transition-colors ${
              imageType === t.value ? "border-[#1d1d1f] bg-white" : "border-[#f0f0f0] bg-[#f5f5f7] hover:bg-white hover:border-[#d2d2d7]"
            }`}
          >
            <p className="text-[13px] font-medium text-[#1d1d1f]">{t.label}</p>
            <p className="text-[11px] text-[#86868b] mt-0.5">{t.hint}</p>
          </button>
        ))}
      </div>

      {/* File drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-[#d2d2d7] rounded-2xl p-8 text-center cursor-pointer hover:border-[#0071e3] hover:bg-[#f5f9ff] transition-all"
      >
        {preview ? (
          <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-xl object-contain" />
        ) : (
          <div>
            <p className="text-[28px] mb-2">🖼️</p>
            <p className="text-[14px] font-medium text-[#1d1d1f]">クリックして画像を選択</p>
            <p className="text-[12px] text-[#86868b] mt-1">PNG / JPEG</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      </div>

      {file && (
        <div className="flex items-center justify-between text-[12px] text-[#6e6e73] px-1">
          <span>📎 {file.name} ({(file.size / 1024).toFixed(0)}KB)</span>
          <button onClick={() => { setFile(null); setPreview(null); }} className="hover:text-[#1d1d1f]">✕</button>
        </div>
      )}

      {/* Dry run toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setDryRun(!dryRun)}
          className={`w-10 h-6 rounded-full transition-colors relative ${dryRun ? "bg-[#1d1d1f]" : "bg-[#d2d2d7]"}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${dryRun ? "left-5" : "left-1"}`} />
        </div>
        <div>
          <p className="text-[13px] font-medium text-[#1d1d1f]">
            ドライラン {dryRun ? "ON" : "OFF"}
          </p>
          <p className="text-[11px] text-[#86868b]">
            {dryRun
              ? "ON: アップロードを検証するが審査には提出しない（テスト用）"
              : "OFF: 実際にストアの審査に提出する"}
          </p>
        </div>
      </label>

      {/* Upload button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={upload}
          disabled={!file || state === "uploading"}
          variant={state === "error" ? "danger" : dryRun ? "secondary" : "primary"}
        >
          {state === "uploading"
            ? (dryRun ? "検証中..." : "提出中...")
            : state === "done" ? "完了 ✓"
            : dryRun ? "ドライラン実行" : "🚀 審査に提出"}
        </Button>
        {message && (
          <p className={`text-[13px] ${state === "error" ? "text-red-500" : state === "waiting" ? "text-[#a05c00]" : "text-[#1d7a47]"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
