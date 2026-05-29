"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type EscalationRules = { threshold: number; condition: string; unit: string };
type HaltConditions  = { maxErrors: number };
type AgentMeta = {
  taskDescription: string;
  operatorName: string;
  approvedAt: string;
  approverName: string;
  monthlySavingsHours: number;
};

type GovernanceConfig = {
  escalationRules: Partial<EscalationRules>;
  haltConditions:  Partial<HaltConditions>;
  fallbackBehavior: string;
  agentMeta: Partial<AgentMeta>;
};

type Props = {
  appId:   string;
  appName: string;
  domain:  "sns" | "aso";
  initialConfig: GovernanceConfig;
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const FALLBACK_OPTIONS = [
  { value: "pause",        label: "一時停止",   desc: "オーナー返答まで全処理を止める" },
  { value: "conservative", label: "保守的実行", desc: "リスクの低い処理のみ継続する" },
  { value: "continue",     label: "継続実行",   desc: "通常通り実行を継続する" },
];

const DOMAIN_DEFAULTS: Record<string, { condition: string; unit: string; threshold: number }> = {
  sns: { condition: "ネガティブ言及率",   unit: "% 以上でHoriへ通知",       threshold: 30 },
  aso: { condition: "キーワード順位急落", unit: "位以上の下落でHoriへ通知", threshold: 10 },
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function SectionHeader({ title, rule }: { title: string; rule: string }) {
  return (
    <p className="text-[13px] font-medium text-[#1d1d1f] mb-1">
      {title}{" "}
      <span className="text-[11px] font-normal text-[#86868b] ml-1">行動規範 {rule}</span>
    </p>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] text-[#6e6e73] w-28 shrink-0">{label}</span>
      {children}
    </div>
  );
}

const inputCls =
  "px-3 py-1.5 bg-white rounded-lg text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] w-24";

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function GovernancePanel({ appId, appName, domain, initialConfig }: Props) {
  const router = useRouter();
  const def = DOMAIN_DEFAULTS[domain];

  // ── #8/#12/#13 form state (sent to review) ──
  const [escThreshold, setEscThreshold] = useState(
    initialConfig.escalationRules.threshold ?? def.threshold
  );
  const escCondition = initialConfig.escalationRules.condition ?? def.condition;
  const escUnit      = initialConfig.escalationRules.unit      ?? def.unit;

  const [maxErrors, setMaxErrors] = useState(
    initialConfig.haltConditions.maxErrors ?? 5
  );
  const [fallback, setFallback] = useState(initialConfig.fallbackBehavior ?? "pause");

  // ── §5 agent meta form state (direct save) ──
  const meta = initialConfig.agentMeta;
  const [taskDesc,   setTaskDesc]   = useState(meta.taskDescription    ?? "");
  const [operator,   setOperator]   = useState(meta.operatorName        ?? "");
  const [approvedAt, setApprovedAt] = useState(meta.approvedAt          ?? "");
  const [approver,   setApprover]   = useState(meta.approverName        ?? "");
  const [savingsHrs, setSavingsHrs] = useState(meta.monthlySavingsHours ?? 0);

  // ── UI state ──
  const [reviewState, setReviewState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [metaState,   setMetaState]   = useState<"idle" | "saving" | "saved">("idle");

  // ── Send threshold changes to review ──
  async function sendForReview() {
    setReviewState("sending");
    try {
      const res = await fetch("/api/governance-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          appId,
          appName,
          current: {
            escalationRules: {
              threshold: initialConfig.escalationRules.threshold ?? def.threshold,
              condition: escCondition,
              unit: escUnit,
            },
            haltConditions:  { maxErrors: initialConfig.haltConditions.maxErrors ?? 5 },
            fallbackBehavior: initialConfig.fallbackBehavior ?? "pause",
          },
          proposed: {
            escalationRules: { threshold: escThreshold, condition: escCondition, unit: escUnit },
            haltConditions:  { maxErrors },
            fallbackBehavior: fallback,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.error === "no changes detected") {
          alert("変更がありません。値を変更してからレビューに送ってください。");
          setReviewState("idle");
          return;
        }
        throw new Error(err.error);
      }
      setReviewState("sent");
      router.refresh();
    } catch {
      setReviewState("error");
      setTimeout(() => setReviewState("idle"), 3000);
    }
  }

  // ── Save agent meta directly ──
  async function saveMeta() {
    setMetaState("saving");
    await fetch(`/api/${domain}/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentMeta: {
          taskDescription:     taskDesc,
          operatorName:        operator,
          approvedAt,
          approverName:        approver,
          monthlySavingsHours: savingsHrs,
        },
      }),
    });
    setMetaState("saved");
    setTimeout(() => setMetaState("idle"), 2000);
  }

  return (
    <div className="space-y-10">

      {/* ── #8 エスカレーション閾値 ──────────────── */}
      <div>
        <SectionHeader title="エスカレーション閾値" rule="#8" />
        <p className="text-[12px] text-[#6e6e73] mb-4">
          この条件を超えたとき、Agentは自律判断せずHoriへ通知します。
        </p>
        <div className="bg-[#f5f5f7] rounded-xl px-4 py-4 space-y-3">
          <FieldRow label="条件">
            <span className="text-[13px] text-[#1d1d1f]">{escCondition}</span>
          </FieldRow>
          <FieldRow label="閾値">
            <input
              type="number" min={1} max={100}
              value={escThreshold}
              onChange={(e) => setEscThreshold(Number(e.target.value))}
              className={inputCls}
            />
            <span className="text-[13px] text-[#6e6e73]">{escUnit}</span>
          </FieldRow>
        </div>
      </div>

      {/* ── #12 停止条件 ──────────────────────────── */}
      <div>
        <SectionHeader title="停止条件" rule="#12" />
        <p className="text-[12px] text-[#6e6e73] mb-4">
          この条件に達したとき、Agentは自動停止しHoriへ報告します。
        </p>
        <div className="bg-[#f5f5f7] rounded-xl px-4 py-4 space-y-3">
          <FieldRow label="条件">
            <span className="text-[13px] text-[#1d1d1f]">連続エラー</span>
          </FieldRow>
          <FieldRow label="最大回数">
            <input
              type="number" min={1} max={50}
              value={maxErrors}
              onChange={(e) => setMaxErrors(Number(e.target.value))}
              className={inputCls}
            />
            <span className="text-[13px] text-[#6e6e73]">回以上でAgent停止</span>
          </FieldRow>
        </div>
      </div>

      {/* ── #13 フォールバック ───────────────────── */}
      <div>
        <SectionHeader title="オーナー不在時の動作" rule="#13" />
        <p className="text-[12px] text-[#6e6e73] mb-4">
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
      </div>

      {/* ── Review button (#8/#12/#13) ───────────── */}
      <div className="bg-[#f5f5f7] rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-[#1d1d1f]">閾値設定をレビューに送る</p>
          <p className="text-[12px] text-[#6e6e73] mt-0.5">
            変更内容が「提案」として登録され、承認後に反映されます。
          </p>
        </div>
        {reviewState === "sent" ? (
          <a
            href="/proposals"
            className="shrink-0 px-5 py-2 bg-[#f0faf4] text-[#1d7a47] rounded-xl text-[13px] font-medium hover:bg-[#e0f5ea] transition-colors"
          >
            提案を確認 →
          </a>
        ) : (
          <button
            onClick={sendForReview}
            disabled={reviewState === "sending"}
            className="shrink-0 px-5 py-2 bg-[#1d1d1f] hover:bg-black text-white rounded-xl text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {reviewState === "sending" ? "送信中..." : reviewState === "error" ? "エラー" : "レビューに送る"}
          </button>
        )}
      </div>

      {/* ── §5 Agent台帳 ─────────────────────────── */}
      <div className="pt-2 border-t border-[#f0f0f0]">
        <p className="text-[13px] font-medium text-[#1d1d1f] mb-1">
          Agent台帳{" "}
          <span className="text-[11px] font-normal text-[#86868b] ml-1">運用ポリシー §5</span>
        </p>
        <p className="text-[12px] text-[#6e6e73] mb-4">
          台帳情報は承認不要で即時保存されます。
        </p>
        <div className="bg-[#f5f5f7] rounded-xl px-4 py-4 space-y-4">
          <FieldRow label="対象業務">
            <input type="text" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="例: SNSの言及を自動収集・通知"
              className="flex-1 px-3 py-1.5 bg-white rounded-lg text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
          </FieldRow>
          <FieldRow label="運用責任者">
            <input type="text" value={operator} onChange={(e) => setOperator(e.target.value)}
              placeholder="例: 山田 太郎"
              className="flex-1 px-3 py-1.5 bg-white rounded-lg text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
          </FieldRow>
          <FieldRow label="承認日">
            <input type="date" value={approvedAt} onChange={(e) => setApprovedAt(e.target.value)}
              className={inputCls + " w-36"} />
          </FieldRow>
          <FieldRow label="承認者">
            <input type="text" value={approver} onChange={(e) => setApprover(e.target.value)}
              placeholder="例: 鈴木 一郎"
              className="flex-1 px-3 py-1.5 bg-white rounded-lg text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
          </FieldRow>
          <FieldRow label="月間削減工数">
            <input type="number" min={0} value={savingsHrs}
              onChange={(e) => setSavingsHrs(Number(e.target.value))}
              className={inputCls} />
            <span className="text-[13px] text-[#6e6e73]">時間 / 月</span>
          </FieldRow>
        </div>

        <div className="mt-4">
          <button
            onClick={saveMeta}
            disabled={metaState === "saving"}
            className="px-5 py-2 bg-[#1d1d1f] hover:bg-black text-white rounded-xl text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {metaState === "saving" ? "保存中..." : metaState === "saved" ? "保存しました ✓" : "台帳を保存"}
          </button>
        </div>
      </div>

    </div>
  );
}
