"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

type KwData = {
  keyword: string;
  rank: number | null;
  prevRank: number | null;
  volume: number | null;
  difficulty: number | null;
};

type AppMetrics = {
  downloads: number | null;
  revenues: number | null;
  revenueCurrency: string;
  ratingsAvg: number | null;
  ratingsTotal: number | null;
  appPower: number | null;
};

type Analysis = {
  result: string;
  cause: string;
  nextAction: string;
  field: string;
  proposed: string;
  periodLabel: string;
};

type Proposal = {
  id: string;
  title: string;
  summary: string;
  rationale: string; // JSON string of Analysis
  status: string;
};

type Props = {
  appId: string;
  periodFrom: string | null;
  periodTo: string | null;
  syncedAt: string | null;
  metrics: AppMetrics | null;
  keywords: KwData[];
  pendingProposals: Proposal[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number | null }) {
  if (!rank || rank >= 500)
    return <span className="px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-[#f5f5f7] text-[#86868b]">圏外</span>;
  if (rank <= 10)
    return <span className="px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-[#f0faf4] text-[#1d7a47]">{rank}位</span>;
  if (rank <= 50)
    return <span className="px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-[#fff7e6] text-[#a05c00]">{rank}位</span>;
  return <span className="px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-[#f5f5f7] text-[#6e6e73]">{rank}位</span>;
}

function TrendBadge({ rank, prevRank }: { rank: number | null; prevRank: number | null }) {
  if (rank == null || prevRank == null) return null;
  const r = rank >= 500 ? 500 : rank;
  const p = prevRank >= 500 ? 500 : prevRank;
  const diff = r - p;
  if (diff === 0) return <span className="text-[12px] text-[#86868b]">→</span>;
  if (diff < 0) return <span className="text-[12px] text-[#1d7a47] font-medium">↑{Math.abs(diff)}</span>;
  return <span className="text-[12px] text-red-500 font-medium">↓{diff}</span>;
}

function MiniBar({ value, max, color }: { value: number | null; max: number; color: string }) {
  const pct = value != null ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 w-28">
      <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-[#6e6e73] w-6 text-right">{value ?? "?"}</span>
    </div>
  );
}

function OpportunityTag({ kw }: { kw: KwData }) {
  const rank = kw.rank ?? 501;
  const vol = kw.volume ?? 0;
  const diff = kw.difficulty ?? 100;
  if (rank <= 10) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f0faf4] text-[#1d7a47]">✓ 維持</span>;
  if (rank <= 50) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#fff7e6] text-[#a05c00]">⚡ 強化</span>;
  if (rank >= 500 && vol >= 20 && diff <= 65)
    return <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#fff1f0] text-[#c0392b] font-medium">🔴 攻める</span>;
  if (diff > 70)
    return <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#86868b]">✗ 難</span>;
  return <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#6e6e73]">様子見</span>;
}

function AppPowerBar({ value }: { value: number | null }) {
  const pct = value != null ? (value / 10) * 100 : 0;
  const color = value == null ? "bg-[#d2d2d7]" : value >= 5 ? "bg-emerald-500" : value >= 2 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className={`text-[28px] font-semibold leading-none tracking-tight ${value != null && value < 2 ? "text-red-500" : "text-[#1d1d1f]"}`}>
          {value ?? "—"}
        </span>
        {value != null && <span className="text-[14px] text-[#6e6e73]">/10</span>}
      </div>
      <div className="mt-2 h-1.5 w-20 bg-[#f0f0f0] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Proposal Card ───────────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  onDecide,
}: {
  proposal: Proposal;
  onDecide: (id: string, decision: "yes" | "no", note?: string) => Promise<void>;
}) {
  const [deciding, setDeciding] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideNote, setOverrideNote] = useState("");
  const [expanded, setExpanded] = useState(false);

  let analysis: Analysis | null = null;
  try { analysis = JSON.parse(proposal.rationale); } catch { /* fallback */ }

  async function handleYes() {
    setDeciding(true);
    await onDecide(proposal.id, "yes");
  }

  async function handleOverride() {
    setDeciding(true);
    await onDecide(proposal.id, "no", overrideNote);
  }

  return (
    <div className="border border-[#d2d2d7] rounded-2xl overflow-hidden">
      <div className="px-5 py-4">
        <p className="text-[15px] font-medium text-[#1d1d1f] mb-1">{proposal.title}</p>
        <p className="text-[13px] text-[#6e6e73] leading-relaxed">{proposal.summary}</p>

        {analysis ? (
          <div className="mt-4 space-y-3">
            {/* 結果 */}
            <div className="bg-[#f5f5f7] rounded-xl px-4 py-3">
              <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-1">結果</p>
              <p className="text-[13px] text-[#1d1d1f] leading-relaxed">{analysis.result}</p>
            </div>
            {/* 原因分析 */}
            <div className="bg-[#fff7e6] rounded-xl px-4 py-3">
              <p className="text-[11px] font-semibold text-[#a05c00] uppercase tracking-wide mb-1">原因分析</p>
              <p className="text-[13px] text-[#1d1d1f] leading-relaxed">{analysis.cause}</p>
            </div>
            {/* ネクストアクション */}
            <div className="bg-[#f0faf4] rounded-xl px-4 py-3">
              <p className="text-[11px] font-semibold text-[#1d7a47] uppercase tracking-wide mb-1">ネクストアクション</p>
              <p className="text-[13px] text-[#1d1d1f] leading-relaxed">{analysis.nextAction}</p>
              {analysis.proposed && (
                <p className="text-[12px] text-[#6e6e73] mt-1.5 font-mono bg-white rounded-lg px-2 py-1 inline-block">
                  → &ldquo;{analysis.proposed}&rdquo;
                </p>
              )}
            </div>
          </div>
        ) : (
          <details className="mt-3">
            <summary className="text-[12px] text-[#0071e3] cursor-pointer hover:underline">詳細を見る</summary>
            <p className="text-[13px] text-[#1d1d1f] mt-2 leading-relaxed whitespace-pre-line">{proposal.rationale}</p>
          </details>
        )}
      </div>

      {/* Action bar */}
      <div className="px-5 py-3 border-t border-[#f0f0f0] bg-[#fafafa]">
        {!showOverride ? (
          <div className="flex items-center gap-3">
            <Button size="sm" disabled={deciding} onClick={handleYes}>
              承認（対応する）
            </Button>
            <button
              disabled={deciding}
              onClick={() => setShowOverride(true)}
              className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors disabled:opacity-50"
            >
              違う…
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[12px] text-[#6e6e73]">どう違いますか？（省略可）</p>
            <textarea
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              placeholder="例: 先週のリリースでキーワード変更済み / 競合の影響で一時的な下落"
              className="w-full px-3 py-2 text-[13px] bg-[#f5f5f7] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              rows={2}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="danger" disabled={deciding} onClick={handleOverride}>
                差し戻す
              </Button>
              <button
                onClick={() => setShowOverride(false)}
                className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f]"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function AsoDataSection({ appId, periodFrom, periodTo, syncedAt, metrics, keywords, pendingProposals }: Props) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState<"idle" | "running" | "done" | "error">("idle");
  const [localProposals, setLocalProposals] = useState(pendingProposals);

  // 集計期間ラベル
  const periodLabel = (() => {
    if (!periodFrom || !periodTo) return null;
    if (periodFrom === periodTo) return periodTo;
    const days = Math.round((new Date(periodTo).getTime() - new Date(periodFrom).getTime()) / 86400000);
    return `${periodFrom} 〜 ${periodTo}（${days}日間）`;
  })();

  async function analyze() {
    setAnalyzing("running");
    try {
      const res = await fetch(`/api/aso/${appId}/analyze`, { method: "POST", credentials: "include" });
      if (res.ok) {
        setAnalyzing("done");
        setTimeout(() => { setAnalyzing("idle"); router.refresh(); }, 800);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("analyze failed:", err);
        setAnalyzing("error");
        setTimeout(() => setAnalyzing("idle"), 3000);
      }
    } catch {
      setAnalyzing("error");
      setTimeout(() => setAnalyzing("idle"), 3000);
    }
  }

  async function onDecide(proposalId: string, decision: "yes" | "no", note?: string) {
    await fetch(`/api/proposals/${proposalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (decision === "yes") {
      await fetch(`/api/proposals/${proposalId}/execute`, { method: "POST" });
    }
    // 差し戻しメモがあれば監査ログ的に記録（将来: proposals に note フィールド追加）
    if (note) {
      console.info(`[ASO proposal rejected] id=${proposalId} note="${note}"`);
    }
    setLocalProposals((p) => p.filter((x) => x.id !== proposalId));
  }

  const sortedKws = [...keywords].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  return (
    <div className="space-y-10">

      {/* ─── 集計期間 ───────────────────────────────────── */}
      {periodLabel && (
        <div className="flex items-center gap-2 text-[13px] text-[#6e6e73]">
          <span className="text-[#86868b]">📅</span>
          <span>集計期間: <span className="text-[#1d1d1f] font-medium">{periodLabel}</span></span>
          {syncedAt && (
            <span className="text-[#c7c7cc]">·</span>
          )}
          {syncedAt && (
            <span>取得: {new Date(syncedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          )}
        </div>
      )}

      {/* ─── App Metrics ────────────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-4 divide-x divide-[#f0f0f0] border border-[#f0f0f0] rounded-2xl">
          <div className="px-6 py-5 rounded-l-2xl">
            <p className="text-[28px] font-semibold text-[#1d1d1f] leading-none tracking-tight">
              {metrics.downloads?.toLocaleString() ?? "—"}
            </p>
            <p className="text-[12px] text-[#6e6e73] mt-2">DL数</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-[28px] font-semibold text-[#1d1d1f] leading-none tracking-tight">
              {metrics.revenues != null ? `$${metrics.revenues}` : "—"}
            </p>
            <p className="text-[12px] text-[#6e6e73] mt-2">売上 {metrics.revenueCurrency}</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-[28px] font-semibold text-[#1d1d1f] leading-none tracking-tight">
              {metrics.ratingsAvg?.toFixed(2) ?? "—"}
            </p>
            <p className="text-[12px] text-[#6e6e73] mt-2">評価 ({metrics.ratingsTotal ?? "?"}件)</p>
          </div>
          <div className="px-6 py-5 rounded-r-2xl">
            <AppPowerBar value={metrics.appPower} />
            <p className="text-[12px] text-[#6e6e73] mt-1">
              App Power
              {metrics.appPower != null && metrics.appPower < 2 && (
                <span className="ml-1 text-red-500">⚠️ 要改善</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ─── Keyword Rankings ───────────────────────────── */}
      {sortedKws.length > 0 && (
        <div>
          <p className="text-[15px] font-semibold text-[#1d1d1f] mb-4">キーワード順位</p>
          <div className="grid grid-cols-[2fr_80px_40px_130px_130px_90px] gap-3 pb-2 border-b border-[#f0f0f0] text-[11px] text-[#86868b] uppercase tracking-wide">
            <span>キーワード</span><span>順位</span><span>変動</span>
            <span>検索ボリューム</span><span>参入難易度</span><span>推奨戦略</span>
          </div>
          <div className="divide-y divide-[#f0f0f0]">
            {sortedKws.map((kw) => (
              <div key={kw.keyword} className="grid grid-cols-[2fr_80px_40px_130px_130px_90px] gap-3 py-3.5 items-center">
                <span className="text-[14px] font-medium text-[#1d1d1f]">{kw.keyword}</span>
                <RankBadge rank={kw.rank} />
                <TrendBadge rank={kw.rank} prevRank={kw.prevRank} />
                <MiniBar value={kw.volume} max={100} color="bg-[#0071e3]" />
                <MiniBar value={kw.difficulty} max={100}
                  color={kw.difficulty != null && kw.difficulty > 70 ? "bg-red-400" : kw.difficulty != null && kw.difficulty > 50 ? "bg-yellow-400" : "bg-emerald-400"} />
                <OpportunityTag kw={kw} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-6 text-[11px] text-[#86868b]">
            <span><span className="inline-block w-2 h-2 rounded-full bg-[#0071e3] mr-1" />検索ボリューム（数値が大きいほど検索数多い）</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />参入難易度 低（攻めやすい）</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />参入難易度 高（競争激しい）</span>
          </div>
        </div>
      )}

      {/* ─── 分析・提案 ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[15px] font-semibold text-[#1d1d1f]">分析・改善提案</p>
            <p className="text-[12px] text-[#86868b] mt-0.5">結果 → 原因分析 → ネクストアクション の3点セット</p>
          </div>
          <Button
            size="sm"
            variant={analyzing === "error" ? "danger" : "secondary"}
            onClick={analyze}
            disabled={analyzing === "running"}
          >
            {analyzing === "running" ? "分析中..." : analyzing === "done" ? "完了 ✓" : analyzing === "error" ? "エラー（再試行）" : "Claude で再分析"}
          </Button>
        </div>

        {localProposals.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-[#d2d2d7] rounded-2xl">
            <p className="text-[#6e6e73] text-[14px]">提案なし</p>
            <p className="text-[12px] text-[#86868b] mt-1">「Claude で再分析」ボタンを押して提案を生成してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {localProposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} onDecide={onDecide} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
