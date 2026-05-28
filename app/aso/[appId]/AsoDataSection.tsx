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

type Proposal = {
  id: string;
  title: string;
  summary: string;
  rationale: string;
  status: string;
};

type Props = {
  appId: string;
  reportDate: string | null;
  syncedAt: string | null;
  metrics: AppMetrics | null;
  keywords: KwData[];
  pendingProposals: Proposal[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number | null }) {
  if (!rank || rank >= 500) {
    return <span className="px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-[#f5f5f7] text-[#86868b]">圏外</span>;
  }
  if (rank <= 10) {
    return <span className="px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-[#f0faf4] text-[#1d7a47]">{rank}位</span>;
  }
  if (rank <= 50) {
    return <span className="px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-[#fff7e6] text-[#a05c00]">{rank}位</span>;
  }
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

// ─── Main component ──────────────────────────────────────────────────────────

export function AsoDataSection({ appId, reportDate, syncedAt, metrics, keywords, pendingProposals }: Props) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [localProposals, setLocalProposals] = useState(pendingProposals);

  async function analyze() {
    setAnalyzing(true);
    const res = await fetch(`/api/aso/${appId}/analyze`, { method: "POST" });
    setAnalyzing(false);
    if (res.ok) router.refresh();
  }

  async function decide(proposalId: string, decision: "yes" | "no") {
    setDecidingId(proposalId);
    await fetch(`/api/proposals/${proposalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (decision === "yes") {
      await fetch(`/api/proposals/${proposalId}/execute`, { method: "POST" });
    }
    setLocalProposals((p) => p.filter((x) => x.id !== proposalId));
    setDecidingId(null);
  }

  const sortedKws = [...keywords].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  return (
    <div className="space-y-10">

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
          <div className="flex items-center justify-between mb-4">
            <p className="text-[15px] font-semibold text-[#1d1d1f]">キーワード順位</p>
            <p className="text-[11px] text-[#86868b]">
              {reportDate} {syncedAt ? new Date(syncedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : ""}
            </p>
          </div>

          {/* Header */}
          <div className="grid grid-cols-[2fr_80px_40px_130px_130px_90px] gap-3 pb-2 border-b border-[#f0f0f0] text-[11px] text-[#86868b] uppercase tracking-wide">
            <span>キーワード</span>
            <span>順位</span>
            <span>変動</span>
            <span>ボリューム</span>
            <span>難易度</span>
            <span>アクション</span>
          </div>

          <div className="divide-y divide-[#f0f0f0]">
            {sortedKws.map((kw) => (
              <div key={kw.keyword} className="grid grid-cols-[2fr_80px_40px_130px_130px_90px] gap-3 py-3.5 items-center">
                <span className="text-[14px] font-medium text-[#1d1d1f]">{kw.keyword}</span>
                <RankBadge rank={kw.rank} />
                <TrendBadge rank={kw.rank} prevRank={kw.prevRank} />
                <MiniBar value={kw.volume} max={100} color="bg-[#0071e3]" />
                <MiniBar value={kw.difficulty} max={100} color={kw.difficulty != null && kw.difficulty > 70 ? "bg-red-400" : kw.difficulty != null && kw.difficulty > 50 ? "bg-yellow-400" : "bg-emerald-400"} />
                <OpportunityTag kw={kw} />
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-6 text-[11px] text-[#86868b]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0071e3]" />ボリューム（検索数）</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />難易度（低=参入しやすい）</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />難易度（高=競争激しい）</span>
          </div>
        </div>
      )}

      {/* ─── Analysis / Proposals ───────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <p className="text-[15px] font-semibold text-[#1d1d1f]">改善提案</p>
          <Button size="sm" variant="secondary" onClick={analyze} disabled={analyzing}>
            {analyzing ? "分析中..." : "Claude で分析・提案を生成"}
          </Button>
        </div>

        {localProposals.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-[#d2d2d7] rounded-2xl">
            <p className="text-[#6e6e73] text-[14px]">提案なし</p>
            <p className="text-[12px] text-[#86868b] mt-1">「Claude で分析・提案を生成」ボタンを押してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {localProposals.map((p) => (
              <div key={p.id} className="border border-[#d2d2d7] rounded-2xl overflow-hidden">
                <div className="px-5 py-4">
                  <p className="text-[15px] font-medium text-[#1d1d1f]">{p.title}</p>
                  <p className="text-[13px] text-[#6e6e73] mt-1 leading-relaxed">{p.summary}</p>
                  <details className="mt-3">
                    <summary className="text-[12px] text-[#0071e3] cursor-pointer hover:underline">根拠を見る</summary>
                    <p className="text-[13px] text-[#1d1d1f] mt-2 leading-relaxed whitespace-pre-line">{p.rationale}</p>
                  </details>
                </div>
                <div className="px-5 py-3 border-t border-[#f0f0f0] bg-[#fafafa] flex items-center gap-3">
                  <Button
                    size="sm"
                    disabled={decidingId === p.id}
                    onClick={() => decide(p.id, "yes")}
                  >
                    承認（対応する）
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={decidingId === p.id}
                    onClick={() => decide(p.id, "no")}
                  >
                    却下
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
