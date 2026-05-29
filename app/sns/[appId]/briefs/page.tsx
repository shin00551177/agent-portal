"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const PLATFORMS = ["TikTok", "Instagram", "YouTube"];
const AGE_OPTIONS = ["指定なし", "10代", "20代女性", "20代男性", "30代女性", "30代男性"];

type Caption = { label: string; caption: string; hashtags: string[] };
type SnsBrief = {
  id: string;
  platform: string;
  targetAge: string | null;
  scriptContent: string;
  captions: Caption[];
  higgsfieldPrompt: string | null;
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

export default function BriefsPage() {
  const { appId } = useParams<{ appId: string }>();
  const [briefs, setBriefs] = useState<SnsBrief[]>([]);
  const [platform, setPlatform] = useState("TikTok");
  const [targetAge, setTargetAge] = useState("指定なし");
  const [script, setScript] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchBriefs() {
    const res = await fetch(`/api/sns/${appId}/briefs`);
    if (res.ok) setBriefs(await res.json());
  }
  useEffect(() => { fetchBriefs(); }, [appId]);

  async function generate() {
    if (!script.trim()) return;
    setGenerating(true);
    setError(null);

    // キャプション生成
    const captionRes = await fetch(`/api/sns/${appId}/briefs/captions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script, platform, targetAge: targetAge === "指定なし" ? undefined : targetAge }),
    });
    const captionData = await captionRes.json();
    if (!captionRes.ok) { setError(captionData.error ?? "キャプション生成失敗"); setGenerating(false); return; }

    // 制作指示書保存
    const briefRes = await fetch(`/api/sns/${appId}/briefs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        targetAge: targetAge === "指定なし" ? undefined : targetAge,
        scriptContent: script,
        captions: captionData.patterns ?? [],
      }),
    });
    const brief = await briefRes.json();
    setGenerating(false);
    if (!briefRes.ok) { setError(brief.error ?? "保存失敗"); return; }

    setBriefs((prev) => [{ ...brief, captions: captionData.patterns ?? [] }, ...prev]);
    setExpanded(brief.id);
    setScript("");
  }

  const PLATFORM_COLOR: Record<string, string> = {
    TikTok: "bg-black text-white",
    Instagram: "bg-[#e1306c] text-white",
    YouTube: "bg-[#ff0000] text-white",
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">制作指示書</h2>
        <p className="text-[13px] text-[#6e6e73] mt-1">
          台本・スクリプトを入力するとキャプション3パターンを生成して制作指示書として保存します
        </p>
      </div>

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
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="台本・シナリオ・制作メモを貼り付けてください..."
          rows={6}
          disabled={generating}
          className="w-full px-4 py-3 rounded-xl border border-[#d2d2d7] text-[13px] resize-none focus:outline-none focus:border-[#0071e3] transition-colors"
        />
        <button onClick={generate} disabled={!script.trim() || generating}
          className="w-full py-3 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] disabled:opacity-40 transition-colors"
        >
          {generating ? "キャプション生成中..." : "キャプションを生成して保存"}
        </button>
        {error && <p className="text-[13px] text-red-500">{error}</p>}
      </div>

      {briefs.length === 0 ? (
        <div className="py-12 rounded-2xl border border-dashed border-[#d2d2d7] text-center">
          <p className="text-[14px] text-[#6e6e73]">制作指示書がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {briefs.map((b) => {
            const captions: Caption[] = Array.isArray(b.captions) ? b.captions : [];
            return (
              <div key={b.id} className="rounded-2xl border border-[#f0f0f0] overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#fafafa] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${PLATFORM_COLOR[b.platform] ?? "bg-[#f5f5f7] text-[#1d1d1f]"}`}>
                      {b.platform}
                    </span>
                    <p className="text-[13px] text-[#6e6e73] truncate">{b.scriptContent.slice(0, 60)}...</p>
                  </div>
                  <span className="text-[#86868b] text-[13px] flex-shrink-0">{expanded === b.id ? "▲" : "▼"}</span>
                </button>

                {expanded === b.id && (
                  <div className="border-t border-[#f0f0f0] px-5 py-4 space-y-5 text-[13px]">
                    <div>
                      <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-2">台本</p>
                      <p className="whitespace-pre-wrap bg-[#f5f5f7] rounded-xl p-3">{b.scriptContent}</p>
                    </div>
                    {captions.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-3">キャプション（3パターン）</p>
                        <div className="space-y-3">
                          {captions.map((cap, i) => (
                            <div key={i} className="rounded-xl bg-[#f5f5f7] p-3 space-y-2">
                              <p className="text-[11px] font-semibold text-[#86868b]">{cap.label}</p>
                              <p className="whitespace-pre-wrap">{cap.caption}</p>
                              <div className="flex flex-wrap gap-1">
                                {cap.hashtags.map((h, j) => (
                                  <span key={j} className="text-[11px] text-[#0071e3]">{h}</span>
                                ))}
                              </div>
                              <CopyBtn text={`${cap.caption}\n\n${cap.hashtags.join(" ")}`} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
