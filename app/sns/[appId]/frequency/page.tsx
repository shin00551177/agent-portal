"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSnsLocale } from "../LocaleContext";

type FreqRec = {
  id: string;
  platform: string;
  currentFrequency: number | null;
  recommendedFrequency: number;
  adjustedFrequency: number | null;
  reasoning: string;
  acceptedAt: string | null;
};

export default function FrequencyPage() {
  const { t } = useSnsLocale();

  const { appId } = useParams<{ appId: string }>();
  const [recs, setRecs] = useState<FreqRec[]>([]);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [currentValues, setCurrentValues] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch(`/api/sns/${appId}/frequency`);
    if (res.ok) setRecs(await res.json());
  }
  useEffect(() => { load(); }, [appId]);

  async function generate() {
    setGenerating(true);
    await fetch(`/api/sns/${appId}/frequency/generate`, { method: "POST" });
    setGenerating(false);
    await load();
  }

  async function accept(rec: FreqRec) {
    const freq = editingId === rec.id ? parseInt(editValue) : (rec.adjustedFrequency ?? rec.recommendedFrequency);
    await fetch(`/api/sns/${appId}/frequency`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: rec.platform, adjustedFrequency: freq }),
    });
    setEditingId(null);
    await load();
  }

  async function saveCurrent(platform: string, value: string) {
    const freq = parseInt(value);
    if (isNaN(freq)) return;
    await fetch(`/api/sns/${appId}/frequency`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, currentFrequency: freq }),
    });
    await load();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">投稿頻度レコメンド</h2>
          <p className="text-[13px] text-[#6e6e73] mt-1">
            エゴサと過去の仮説データをもとにAIが最適な投稿頻度を提案します
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-[13px] font-medium hover:bg-black disabled:opacity-40 transition-colors"
        >
          {generating ? t.frequency.analyzing : t.frequency.analyze}
        </button>
      </div>

      {recs.length === 0 ? (
        <div className="py-16 rounded-2xl border border-dashed border-[#d2d2d7] text-center">
          <p className="text-[14px] text-[#6e6e73]">「AIに分析させる」でレコメンドを生成します</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recs.map((rec) => {
            const effective = rec.adjustedFrequency ?? rec.recommendedFrequency;
            const accepted = !!rec.acceptedAt;
            return (
              <div key={rec.id} className="rounded-2xl border border-[#f0f0f0] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] font-semibold text-[#1d1d1f] capitalize">{rec.platform}</span>
                    {!accepted && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        要確認
                      </span>
                    )}
                    {accepted && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                        確認済み
                      </span>
                    )}
                  </div>
                  {/* 現在の頻度入力 */}
                  <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                    <span>現在:</span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      defaultValue={rec.currentFrequency ?? ""}
                      placeholder="週?回"
                      className="w-14 px-2 py-1 border border-[#d2d2d7] rounded-lg text-[12px] text-[#1d1d1f] text-center focus:outline-none focus:border-[#1d1d1f]"
                      onBlur={(e) => saveCurrent(rec.platform, e.target.value)}
                    />
                    <span>回/週</span>
                  </div>
                </div>

                {/* 数値表示 */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[32px] font-semibold text-[#1d1d1f] leading-none">
                      週{effective}回
                    </p>
                    <p className="text-[11px] text-[#86868b] mt-1">
                      {rec.adjustedFrequency ? t.frequency.adjusted : t.frequency.aiRec}
                    </p>
                  </div>
                  {rec.currentFrequency !== null && rec.currentFrequency !== effective && (
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="text-[#86868b]">現在 週{rec.currentFrequency}回</span>
                      <span className={`font-semibold ${effective > rec.currentFrequency ? "text-emerald-600" : "text-amber-500"}`}>
                        {effective > rec.currentFrequency ? `+${effective - rec.currentFrequency}` : `${effective - rec.currentFrequency}`}回
                      </span>
                    </div>
                  )}
                </div>

                {/* 根拠 */}
                <p className="text-[13px] text-[#6e6e73] leading-relaxed">{rec.reasoning}</p>

                {/* 調整 + 承認 */}
                <div className="flex gap-2">
                  {editingId === rec.id ? (
                    <>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20 px-3 py-2 border border-[#d2d2d7] rounded-xl text-[13px] text-center focus:outline-none focus:border-[#1d1d1f]"
                        placeholder="回/週"
                      />
                      <button
                        onClick={() => accept(rec)}
                        className="flex-1 py-2 rounded-xl bg-[#1d1d1f] text-white text-[13px] font-medium"
                      >
                        この頻度で確定
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-xl bg-[#f5f5f7] text-[#6e6e73] text-[13px]"
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => accept(rec)}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-[13px] font-medium hover:bg-emerald-600 transition-colors"
                      >
                        推奨通りに確定（週{effective}回）
                      </button>
                      <button
                        onClick={() => { setEditingId(rec.id); setEditValue(String(effective)); }}
                        className="px-4 py-2.5 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium hover:bg-[#ebebeb] transition-colors"
                      >
                        調整する
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
