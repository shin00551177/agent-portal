"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

type Option = { id: string; label: string; description: string };

type Proposal = {
  id: string;
  domain: string;
  targetType: string | null;
  targetId: string | null;
  title: string;
  summary: string;
  rationale: string;
  decisionType: string;
  options: unknown;
  actionType: string;
  analysisRun: { id: string; domain: string; createdAt: Date } | null;
  createdAt: Date;
};

const DOMAIN_LABEL: Record<string, string> = {
  aso: "ASO", sns: "SNS", ego: "エゴサ", general: "全般",
};

const ACTION_LABEL: Record<string, string> = {
  add_keywords:     "キーワード追加",
  update_setting:   "設定変更",
  github_workflow:  "ワークフロー実行",
  manual:           "手動対応",
};

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const options = (proposal.options as Option[] | null) ?? [];

  async function decide(decision: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error(await res.text());

      // 承認の場合は即実行
      if (decision !== "no") {
        const execRes = await fetch(`/api/proposals/${proposal.id}/execute`, {
          method: "POST",
        });
        if (!execRes.ok) {
          const err = await execRes.json();
          alert(`実行失敗: ${err.error}`);
        }
      }

      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-[#d2d2d7] rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full text-left px-6 py-5 flex items-start justify-between gap-4 hover:bg-[#f5f5f7]/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-medium text-[#6e6e73] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
              {DOMAIN_LABEL[proposal.domain] ?? proposal.domain}
            </span>
            <span className="text-[11px] text-[#6e6e73] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
              {ACTION_LABEL[proposal.actionType] ?? proposal.actionType}
            </span>
          </div>
          <p className="text-[17px] font-medium text-[#1d1d1f] leading-snug">{proposal.title}</p>
          <p className="text-[14px] text-[#6e6e73] mt-1 leading-relaxed">{proposal.summary}</p>
        </div>
        <span className="text-[#6e6e73] text-[20px] mt-1 flex-shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(90deg)" : "none" }}>›</span>
      </button>

      {/* Expanded: rationale */}
      {expanded && (
        <div className="px-6 pb-5 border-t border-[#f0f0f0]">
          <p className="text-[13px] text-[#6e6e73] uppercase tracking-wide mt-5 mb-2 font-medium">根拠</p>
          <p className="text-[15px] text-[#1d1d1f] leading-relaxed whitespace-pre-line">{proposal.rationale}</p>
          {proposal.analysisRun && (
            <p className="text-[12px] text-[#86868b] mt-3">
              分析日時: {new Date(proposal.analysisRun.createdAt).toLocaleString("ja-JP")}
            </p>
          )}
        </div>
      )}

      {/* Decision bar */}
      <div className="px-6 py-4 border-t border-[#f0f0f0] bg-[#fafafa] flex items-center gap-3 flex-wrap">
        {proposal.decisionType === "yesno" ? (
          <>
            <Button disabled={loading} onClick={() => decide("yes")}>承認して実行</Button>
            <Button disabled={loading} variant="secondary" onClick={() => decide("no")}>却下</Button>
          </>
        ) : (
          <>
            {options.map((opt) => (
              <Button key={opt.id} disabled={loading} onClick={() => decide(opt.id)} title={opt.description}>
                {opt.label}
              </Button>
            ))}
            <Button disabled={loading} variant="secondary" onClick={() => decide("no")}>却下</Button>
          </>
        )}
        {loading && <span className="text-[13px] text-[#6e6e73]">処理中…</span>}
      </div>
    </div>
  );
}
