"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

const AGE_OPTIONS = ["指定なし", "10代", "20代女性", "20代男性", "30代女性", "30代男性", "全年齢"];

type SceneRow = { time: string; scene: string; script: string };
type Result = {
  why_viral: string;
  pattern_type: string;
  hook: string;
  structure: string;
  target_insight: string;
  materials_video: string[];
  materials_audio: string;
  materials_text: string[];
  materials_bgm: string;
  materials_editing: string[];
  scenario_hook: string;
  scenario_structure: SceneRow[];
  scenario_cta: string;
  capcut_notes: string;
  higgsfield_prompt: string;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#f0f0f0] overflow-hidden">
      <div className="px-4 py-3 bg-[#f5f5f7] border-b border-[#f0f0f0]">
        <p className="text-[12px] font-semibold text-[#1d1d1f] uppercase tracking-wide">{title}</p>
      </div>
      <div className="p-4 text-[13px] text-[#1d1d1f]">{children}</div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-[11px] text-[#0071e3] hover:underline ml-2"
    >
      {copied ? "コピー済" : "コピー"}
    </button>
  );
}

export default function AnalyzePage() {
  const { appId } = useParams<{ appId: string }>();
  const [input, setInput] = useState("");
  const [targetAge, setTargetAge] = useState("指定なし");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await fetch(`/api/sns/${appId}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, targetAge: targetAge === "指定なし" ? undefined : targetAge }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "分析失敗"); return; }
    setResult(data);
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">バズ動画分析</h2>
        <p className="text-[13px] text-[#6e6e73] mt-1">
          バズ動画の文字起こし・説明文を貼り付けると、パターン分析・素材リスト・Twomi版シナリオを生成します
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {AGE_OPTIONS.map((age) => (
            <button
              key={age}
              onClick={() => setTargetAge(age)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors ${
                targetAge === age ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#ebebeb]"
              }`}
            >
              {age}
            </button>
          ))}
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="バズ動画のタイトル・説明文・文字起こし・コメント欄などを貼り付けてください..."
          rows={8}
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl border border-[#d2d2d7] text-[13px] resize-none focus:outline-none focus:border-[#0071e3] transition-colors"
        />

        <button
          onClick={analyze}
          disabled={!input.trim() || loading}
          className="w-full py-3 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] disabled:opacity-40 transition-colors"
        >
          {loading ? "AI分析中..." : "分析する"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {/* パターン分析 */}
          <Section title="パターン分析">
            <div className="space-y-2">
              <div><span className="text-[#86868b]">パターン種別: </span>{result.pattern_type}</div>
              <div><span className="text-[#86868b]">バズった理由: </span>{result.why_viral}</div>
              <div><span className="text-[#86868b]">フック手法: </span>{result.hook}</div>
              <div><span className="text-[#86868b]">構成: </span>{result.structure}</div>
              <div><span className="text-[#86868b]">視聴者インサイト: </span>{result.target_insight}</div>
            </div>
          </Section>

          {/* 素材リスト */}
          <Section title="素材リスト">
            <div className="space-y-3">
              {result.materials_video?.length > 0 && (
                <div>
                  <p className="font-medium mb-1">映像素材</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[#6e6e73]">
                    {result.materials_video.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}
              <div><span className="font-medium">音声: </span>{result.materials_audio}</div>
              {result.materials_text?.length > 0 && (
                <div>
                  <p className="font-medium mb-1">テロップ</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[#6e6e73]">
                    {result.materials_text.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}
              <div><span className="font-medium">BGM: </span>{result.materials_bgm}</div>
              {result.materials_editing?.length > 0 && (
                <div>
                  <p className="font-medium mb-1">編集ポイント</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[#6e6e73]">
                    {result.materials_editing.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </Section>

          {/* Twomiシナリオ */}
          <Section title="Twomi版シナリオ">
            <div className="space-y-4">
              <div>
                <span className="font-medium">冒頭フック: </span>
                <span className="text-[#0071e3]">{result.scenario_hook}</span>
                <CopyBtn text={result.scenario_hook} />
              </div>

              {Array.isArray(result.scenario_structure) && result.scenario_structure.length > 0 && (
                <div className="rounded-xl overflow-hidden border border-[#f0f0f0]">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-[#f5f5f7] text-left">
                        <th className="px-3 py-2 text-[#86868b] font-medium w-20">時間</th>
                        <th className="px-3 py-2 text-[#86868b] font-medium">シーン</th>
                        <th className="px-3 py-2 text-[#86868b] font-medium">セリフ / ナレーション</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f0f0]">
                      {result.scenario_structure.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-[#86868b] whitespace-nowrap">{row.time}</td>
                          <td className="px-3 py-2">{row.scene}</td>
                          <td className="px-3 py-2">{row.script}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div><span className="font-medium">CTA: </span>{result.scenario_cta}</div>
            </div>
          </Section>

          {/* 制作ノート */}
          <Section title="CapCut 編集指示">
            <p className="whitespace-pre-wrap">{result.capcut_notes}</p>
          </Section>

          {result.higgsfield_prompt && (
            <Section title="Higgsfield AI プロンプト">
              <p className="font-mono text-[12px] bg-[#f5f5f7] rounded-lg p-3 whitespace-pre-wrap">
                {result.higgsfield_prompt}
              </p>
              <CopyBtn text={result.higgsfield_prompt} />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
