"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const PLATFORMS = ["TikTok", "Instagram", "YouTube"];
const AGE_OPTIONS = ["指定なし", "10代", "20代女性", "20代男性", "30代女性", "30代男性", "全年齢"];

type SnsScript = {
  id: string;
  platform: string;
  targetAge: string | null;
  title: string;
  hook: string | null;
  scriptContent: string | null;
  productionNotes: string | null;
  imagePrompts: string | null;
  createdAt: string;
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-[11px] text-[#0071e3] hover:underline"
    >
      {copied ? "コピー済" : "コピー"}
    </button>
  );
}

export default function ScriptsPage() {
  const { appId } = useParams<{ appId: string }>();
  const [scripts, setScripts] = useState<SnsScript[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [platform, setPlatform] = useState("TikTok");
  const [targetAge, setTargetAge] = useState("指定なし");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchScripts() {
    const res = await fetch(`/api/sns/${appId}/scripts`);
    if (res.ok) setScripts(await res.json());
  }

  useEffect(() => { fetchScripts(); }, [appId]);

  async function generate() {
    setGenerating(true);
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/sns/${appId}/scripts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        targetAge: targetAge === "指定なし" ? undefined : targetAge,
      }),
    });
    const data = await res.json();
    setGenerating(false);
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "生成失敗"); return; }
    setScripts((prev) => [data, ...prev]);
    setExpanded(data.id);
  }

  const PLATFORM_COLOR: Record<string, string> = {
    TikTok: "bg-black text-white",
    Instagram: "bg-[#e1306c] text-white",
    YouTube: "bg-[#ff0000] text-white",
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">台本生成</h2>
        <p className="text-[13px] text-[#6e6e73] mt-1">
          成功パターン・参考動画をもとにTwomi向けの動画台本を生成します
        </p>
      </div>

      {/* 生成フォーム */}
      <div className="rounded-2xl border border-[#f0f0f0] p-5 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map((p) => (
            <button key={p} onClick={() => setPlatform(p)}
              className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                platform === p ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#ebebeb]"
              }`}
            >{p}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {AGE_OPTIONS.map((age) => (
            <button key={age} onClick={() => setTargetAge(age)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors ${
                targetAge === age ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#ebebeb]"
              }`}
            >{age}</button>
          ))}
        </div>
        <button onClick={generate} disabled={generating}
          className="w-full py-3 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] disabled:opacity-40 transition-colors"
        >
          {generating ? "生成中..." : "台本を生成"}
        </button>
        {error && <p className="text-[13px] text-red-500">{error}</p>}
      </div>

      {/* 台本一覧 */}
      {scripts.length === 0 ? (
        <div className="py-12 rounded-2xl border border-dashed border-[#d2d2d7] text-center">
          <p className="text-[14px] text-[#6e6e73]">台本がありません。上から生成してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map((s) => (
            <div key={s.id} className="rounded-2xl border border-[#f0f0f0] overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#fafafa] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${PLATFORM_COLOR[s.platform] ?? "bg-[#f5f5f7] text-[#1d1d1f]"}`}>
                    {s.platform}
                  </span>
                  <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{s.title}</p>
                  {s.targetAge && <span className="text-[12px] text-[#86868b] flex-shrink-0">{s.targetAge}</span>}
                </div>
                <span className="text-[#86868b] text-[13px] flex-shrink-0">{expanded === s.id ? "▲" : "▼"}</span>
              </button>

              {expanded === s.id && (
                <div className="border-t border-[#f0f0f0] px-5 py-4 space-y-4 text-[13px]">
                  {s.hook && (
                    <div>
                      <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-1">フック</p>
                      <p className="text-[#0071e3] font-medium">{s.hook}</p>
                      <CopyBtn text={s.hook} />
                    </div>
                  )}
                  {s.scriptContent && (
                    <div>
                      <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-1">台本</p>
                      <p className="whitespace-pre-wrap leading-relaxed bg-[#f5f5f7] rounded-xl p-3">{s.scriptContent}</p>
                      <CopyBtn text={s.scriptContent} />
                    </div>
                  )}
                  {s.productionNotes && (
                    <div>
                      <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-1">制作メモ</p>
                      <p className="whitespace-pre-wrap text-[#6e6e73]">{s.productionNotes}</p>
                    </div>
                  )}
                  {s.imagePrompts && (
                    <div>
                      <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-1">画像・動画プロンプト</p>
                      <p className="font-mono text-[12px] bg-[#f5f5f7] rounded-xl p-3 whitespace-pre-wrap">{s.imagePrompts}</p>
                      <CopyBtn text={s.imagePrompts} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
