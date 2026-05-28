"use client";

import { useState } from "react";

type GovernanceConfig = {
  escalationRules: Record<string, unknown>;
  haltConditions: Record<string, unknown>;
  fallbackBehavior: string;
};

type Props = {
  appId: string;
  domain: "sns" | "aso";
  initialConfig: GovernanceConfig;
};

const FALLBACK_OPTIONS = [
  { value: "pause",        label: "一時停止",   desc: "オーナー返答まで全処理を止める" },
  { value: "conservative", label: "保守的実行", desc: "リスクの低い処理のみ継続する" },
  { value: "continue",     label: "継続実行",   desc: "通常通り実行を継続する" },
];

const DEFAULT_ESCALATION: Record<string, { label: string; value: string; unit: string }> = {
  sns: {
    label: "ネガティブ言及率",
    value: "30",
    unit: "% 以上でHoriへ通知",
  },
  aso: {
    label: "キーワード順位急落",
    value: "10",
    unit: "位以上の下落でHoriへ通知",
  },
};

const DEFAULT_HALT: Record<string, { label: string; value: string; unit: string }> = {
  sns: {
    label: "連続エラー",
    value: "5",
    unit: "回以上でAgent停止",
  },
  aso: {
    label: "連続エラー",
    value: "5",
    unit: "回以上でAgent停止",
  },
};

export function GovernancePanel({ appId, domain, initialConfig }: Props) {
  const [fallback, setFallback] = useState(initialConfig.fallbackBehavior ?? "pause");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const escDefault = DEFAULT_ESCALATION[domain];
  const haltDefault = DEFAULT_HALT[domain];

  async function save() {
    setSaving(true);
    await fetch(`/api/${domain}/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fallbackBehavior: fallback }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-8">
      {/* #8 エスカレーション閾値 */}
      <div>
        <p className="text-[13px] font-medium text-[#1d1d1f] mb-1">
          エスカレーション閾値 <span className="text-[11px] font-normal text-[#86868b] ml-1">行動規範 #8</span>
        </p>
        <p className="text-[12px] text-[#6e6e73] mb-3">
          この条件を超えたとき、Agentは自律判断せずHoriに通知します。
        </p>
        <div className="bg-[#f5f5f7] rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-[13px] text-[#6e6e73]">{escDefault.label}が</span>
          <span className="text-[15px] font-semibold text-[#1d1d1f]">{escDefault.value}</span>
          <span className="text-[13px] text-[#6e6e73]">{escDefault.unit}</span>
        </div>
      </div>

      {/* #12 撤退・停止条件 */}
      <div>
        <p className="text-[13px] font-medium text-[#1d1d1f] mb-1">
          停止条件 <span className="text-[11px] font-normal text-[#86868b] ml-1">行動規範 #12</span>
        </p>
        <p className="text-[12px] text-[#6e6e73] mb-3">
          この条件に達したとき、Agentは自動停止しHoriに報告します。
        </p>
        <div className="bg-[#f5f5f7] rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-[13px] text-[#6e6e73]">{haltDefault.label}が</span>
          <span className="text-[15px] font-semibold text-[#1d1d1f]">{haltDefault.value}</span>
          <span className="text-[13px] text-[#6e6e73]">{haltDefault.unit}</span>
        </div>
      </div>

      {/* #13 オーナー不在時のフォールバック */}
      <div>
        <p className="text-[13px] font-medium text-[#1d1d1f] mb-1">
          オーナー不在時の動作 <span className="text-[11px] font-normal text-[#86868b] ml-1">行動規範 #13</span>
        </p>
        <p className="text-[12px] text-[#6e6e73] mb-3">
          Horiが返答できない状態が続いたとき、Agentはどう動くか。
        </p>
        <div className="space-y-2">
          {FALLBACK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFallback(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                fallback === opt.value
                  ? "border-[#1d1d1f] bg-white"
                  : "border-[#f0f0f0] bg-[#f5f5f7] hover:bg-white hover:border-[#d2d2d7]"
              }`}
            >
              <p className="text-[13px] font-medium text-[#1d1d1f]">{opt.label}</p>
              <p className="text-[12px] text-[#6e6e73] mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-[#1d1d1f] hover:bg-black text-white rounded-xl text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : saved ? "保存しました" : "保存"}
          </button>
          <span className="text-[12px] text-[#86868b]">
            現在: <span className="text-[#1d1d1f]">{FALLBACK_OPTIONS.find((o) => o.value === fallback)?.label}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
