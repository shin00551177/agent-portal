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
  result?: { waitingForVersion?: boolean; error?: string } | null;
};

type RankingHistory = Record<string, Record<string, number | null>>;

type Props = {
  appId: string;
  periodFrom: string | null;
  periodTo: string | null;
  isRangeQuery?: boolean;
  rankingHistory?: RankingHistory | null;
  syncedAt: string | null;
  metrics: AppMetrics | null;
  keywords: KwData[];
  pendingProposals: Proposal[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function RankCell({ rank, prevRank }: { rank: number | null; prevRank: number | null }) {
  const r = rank ?? 501;
  const p = prevRank != null ? (prevRank >= 500 ? 500 : prevRank) : null;
  const curr = r >= 500 ? 500 : r;
  const diff = p != null ? curr - p : null;

  // 前回比（順位が下がるほど数字が増える = ↑がよい）
  const trendEl = diff == null ? null
    : diff === 0 ? <span className="text-[10px] text-[#86868b]">前回と同じ</span>
    : diff < 0   ? <span className="text-[10px] text-[#1d7a47] font-medium">↑{Math.abs(diff)}位上昇</span>
    :               <span className="text-[10px] text-red-500 font-medium">↓{diff}位下落</span>;

  const badge = r >= 500
    ? <span className="px-2 py-0.5 rounded-md text-[12px] font-semibold bg-[#f5f5f7] text-[#86868b]">圏外</span>
    : r <= 10
    ? <span className="px-2 py-0.5 rounded-md text-[12px] font-semibold bg-[#f0faf4] text-[#1d7a47]">{r}位</span>
    : r <= 50
    ? <span className="px-2 py-0.5 rounded-md text-[12px] font-semibold bg-[#fff7e6] text-[#a05c00]">{r}位</span>
    : <span className="px-2 py-0.5 rounded-md text-[12px] font-semibold bg-[#f5f5f7] text-[#6e6e73]">{r}位</span>;

  return (
    <div className="flex items-center gap-1.5">
      {badge}
      {trendEl}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number | null; max: number; color: string }) {
  const pct = value != null ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full">
      <span className="text-[12px] font-medium text-[#1d1d1f]">{value ?? "—"}</span>
      <div className="mt-1 h-1.5 w-full bg-[#f0f0f0] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function OpportunityTag({ kw }: { kw: KwData }) {
  const rank = kw.rank ?? 501;
  const vol = kw.volume ?? 0;
  const diff = kw.difficulty ?? 100;
  if (rank <= 10) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f0faf4] text-[#1d7a47]">✓ 守る</span>;
  if (rank <= 50) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#fff7e6] text-[#a05c00]">↑ 伸ばす</span>;
  if (rank >= 500 && vol >= 20 && diff <= 65)
    return <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#fff1f0] text-[#c0392b] font-medium">🎯 ねらう</span>;
  if (diff > 70)
    return <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#86868b]">激戦区</span>;
  return <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#6e6e73]">様子見</span>;
}

function AppPowerGauge({ value }: { value: number | null }) {
  const v = value ?? 0;
  const pct = Math.min(v / 10, 1);
  // 左右に余白を持たせた座標系（viewBox "-8 0 88 52"）
  const r = 30, cx = 44, cy = 40;
  const circumference = Math.PI * r;
  const dash = circumference * pct;
  const color = v >= 5 ? "#34c759" : v >= 2 ? "#ff9f0a" : "#ff3b30";
  const label = v >= 5 ? "良好" : v >= 2 ? "改善余地あり" : "要改善";

  return (
    <div className="flex flex-col items-center">
      <svg width="80" height="52" viewBox="-4 0 96 52" overflow="visible">
        <path
          d={`M 14 40 A ${r} ${r} 0 0 1 74 40`}
          fill="none" stroke="#f0f0f0" strokeWidth="7" strokeLinecap="round"
        />
        <path
          d={`M 14 40 A ${r} ${r} 0 0 1 74 40`}
          fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="600"
          fill={value == null ? "#c7c7cc" : "#1d1d1f"}>
          {value ?? "—"}
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="#86868b">/10</text>
      </svg>
      <p className={`text-[10px] font-medium -mt-1 ${v >= 5 ? "text-[#1d7a47]" : v >= 2 ? "text-[#a05c00]" : "text-red-500"}`}>
        {value != null ? label : "—"}
      </p>
    </div>
  );
}

function KeywordStrategySummary({ keywords }: { keywords: KwData[] }) {
  const counts = keywords.reduce((acc, kw) => {
    const rank = kw.rank ?? 501;
    const vol = kw.volume ?? 0;
    const diff = kw.difficulty ?? 100;
    const key = rank <= 10 ? "守る"
      : rank <= 50 ? "伸ばす"
      : rank >= 500 && vol >= 20 && diff <= 65 ? "ねらう"
      : diff > 70 ? "激戦区"
      : "様子見";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ITEMS = [
    { key: "ねらう",  color: "bg-[#fff1f0] text-[#c0392b]", icon: "🎯" },
    { key: "伸ばす",  color: "bg-[#fff7e6] text-[#a05c00]", icon: "↑"  },
    { key: "守る",   color: "bg-[#f0faf4] text-[#1d7a47]", icon: "✓"  },
    { key: "激戦区", color: "bg-[#f5f5f7] text-[#86868b]", icon: "⚡" },
    { key: "様子見", color: "bg-[#f5f5f7] text-[#6e6e73]", icon: "−"  },
  ].filter(({ key }) => counts[key]);

  if (ITEMS.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {ITEMS.map(({ key, color, icon }) => (
        <span key={key} className={`inline-flex items-center gap-1 text-[12px] font-medium px-3 py-1 rounded-full ${color}`}>
          {icon} {key} <span className="font-bold">{counts[key]}</span>
        </span>
      ))}
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
      <div className="px-5 py-4 border-t border-[#f0f0f0] bg-[#fafafa]">
        {/* バージョン待ちバナー */}
        {proposal.result?.waitingForVersion && (
          <div className="mb-3 flex items-center gap-2 px-4 py-2.5 bg-[#fff7e6] rounded-xl">
            <span className="text-[14px]">⏳</span>
            <div className="flex-1">
              <p className="text-[12px] font-medium text-[#a05c00]">バージョン待ち</p>
              <p className="text-[11px] text-[#a05c00] mt-0.5">App Store Connect に編集可能なバージョンがありません。VN チームが新バージョンを作成後、再試行してください。</p>
            </div>
          </div>
        )}

        {!showOverride ? (
          <div className="flex items-center gap-3">
            <button
              disabled={deciding}
              onClick={handleYes}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1d1d1f] hover:bg-black text-white rounded-xl text-[14px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-sm"
            >
              {proposal.result?.waitingForVersion ? "🔄 再試行" : "🚀 よし、やろう！"}
            </button>
            <button
              disabled={deciding}
              onClick={() => setShowOverride(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#6e6e73] hover:text-[#1d1d1f] rounded-xl text-[14px] font-medium transition-all disabled:opacity-50"
            >
              🤔 ちょっと違う…
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[13px] text-[#6e6e73]">どう違いますか？（省略可）</p>
            <textarea
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              placeholder="例: 先週のリリースでキーワード変更済み / 競合の影響で一時的な下落"
              className="w-full px-3 py-2 text-[13px] bg-[#f5f5f7] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              rows={2}
            />
            <div className="flex items-center gap-2">
              <Button size="md" variant="danger" disabled={deciding} onClick={handleOverride}>
                差し戻す
              </Button>
              <button
                onClick={() => setShowOverride(false)}
                className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f]"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
        <p className="mt-2.5 text-[11px] text-[#c7c7cc]">
          ※ 承認はメモとして記録されます。App Store への自動反映は API キー設定後に有効になります。
        </p>
      </div>
    </div>
  );
}

// ─── Ask Claude ──────────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  "App Powerがこんなに低いのはなぜ？",
  "今すぐできる改善アクションは？",
  "どのキーワードを優先的に攻めるべき？",
];

function AskSection({ appId }: { appId: string }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setAnswer(null);
    setError(null);
    setQuestion(q);
    try {
      const res = await fetch(`/api/aso/${appId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok) setAnswer(json.answer);
      else setError(json.error ?? "エラーが発生しました");
    } catch {
      setError("通信エラーが発生しました");
    }
    setLoading(false);
  }

  return (
    <div className="border border-[#d2d2d7] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#f0f0f0] bg-[#fafafa]">
        <p className="text-[14px] font-medium text-[#1d1d1f]">💬 AIに聞く</p>
        <p className="text-[12px] text-[#6e6e73] mt-0.5">このデータについて何でも聞いてください</p>
      </div>

      {/* Quick questions */}
      <div className="px-5 pt-4 flex flex-wrap gap-2">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            disabled={loading}
            className="text-[12px] px-3 py-1.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] rounded-full transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-5 py-4 flex gap-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(question)}
          placeholder="例: なぜライブ配信は44位なの？ / ライバルアプリと何が違う？"
          className="flex-1 px-4 py-2.5 bg-[#f5f5f7] rounded-xl text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          disabled={loading}
        />
        <Button size="sm" onClick={() => ask(question)} disabled={loading || !question.trim()}>
          {loading ? "..." : "聞く"}
        </Button>
      </div>

      {/* Answer */}
      {(loading || answer || error) && (
        <div className="px-5 pb-5">
          <div className="border-t border-[#f0f0f0] pt-4">
            {loading && (
              <div className="flex items-center gap-2 text-[13px] text-[#6e6e73]">
                <span className="inline-block w-2 h-2 rounded-full bg-[#0071e3] animate-pulse" />
                考えています...
              </div>
            )}
            {answer && (
              <div className="space-y-2">
                <p className="text-[11px] text-[#86868b] font-medium">Q: {question}</p>
                <p className="text-[14px] text-[#1d1d1f] leading-relaxed whitespace-pre-line">{answer}</p>
              </div>
            )}
            {error && <p className="text-[13px] text-red-500">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function AsoDataSection({ appId, periodFrom, periodTo, isRangeQuery, rankingHistory, syncedAt, metrics, keywords, pendingProposals }: Props) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState<"idle" | "running" | "done" | "error">("idle");
  const [slackState, setSlackState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [localProposals, setLocalProposals] = useState(pendingProposals);

  // 集計期間ラベル
  const periodLabel = (() => {
    if (!periodFrom || !periodTo) return null;
    if (periodFrom === periodTo) return periodTo;
    const days = Math.round((new Date(periodTo).getTime() - new Date(periodFrom).getTime()) / 86400000);
    return `${periodFrom} 〜 ${periodTo}（${days}日間）`;
  })();

  async function sendToSlack() {
    setSlackState("sending");
    try {
      const res = await fetch(`/api/aso/${appId}/report`, { method: "POST", credentials: "include" });
      setSlackState(res.ok ? "sent" : "error");
      setTimeout(() => setSlackState("idle"), 3000);
    } catch {
      setSlackState("error");
      setTimeout(() => setSlackState("idle"), 3000);
    }
  }

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

      {/* ─── Slack 送信ボタン ───────────────────────────── */}
      {!isRangeQuery && metrics && (
        <div className="flex justify-end">
          <button
            onClick={sendToSlack}
            disabled={slackState === "sending"}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
              slackState === "sent"  ? "bg-[#f0faf4] text-[#1d7a47]"
              : slackState === "error" ? "bg-[#fff1f0] text-[#c0392b]"
              : "bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#6e6e73] hover:text-[#1d1d1f]"
            } disabled:opacity-50`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
            {slackState === "sending" ? "送信中..." : slackState === "sent" ? "送信済み ✓" : slackState === "error" ? "エラー" : "Slack に送る"}
          </button>
        </div>
      )}

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
          <div className="px-6 py-3 rounded-r-2xl flex flex-col items-center justify-center">
            <AppPowerGauge value={metrics.appPower} />
            <p className="text-[11px] text-[#6e6e73] mt-1">App Power</p>
          </div>
        </div>
      )}

      {/* ─── 期間指定トレンドテーブル ───────────────────── */}
      {isRangeQuery && rankingHistory && (() => {
        // 週次サンプリング（最大8点）
        const allDates = Object.values(rankingHistory)[0] ? Object.keys(Object.values(rankingHistory)[0]).sort() : [];
        const step = Math.max(1, Math.floor(allDates.length / 8));
        const sampledDates = allDates.filter((_, i) => i % step === 0 || i === allDates.length - 1);
        const kwList = Object.keys(rankingHistory);

        return (
          <div>
            <p className="text-[15px] font-semibold text-[#1d1d1f] mb-4">順位推移（{periodFrom} 〜 {periodTo}）</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#f0f0f0]">
                    <th className="text-left py-2 pr-4 text-[#86868b] font-medium w-32">キーワード</th>
                    {sampledDates.map((d) => (
                      <th key={d} className="text-center py-2 px-2 text-[#86868b] font-medium whitespace-nowrap">
                        {d.slice(5)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f5f7]">
                  {kwList.map((kw) => (
                    <tr key={kw}>
                      <td className="py-2.5 pr-4 font-medium text-[#1d1d1f]">{kw}</td>
                      {sampledDates.map((d) => {
                        const r = rankingHistory[kw]?.[d];
                        const rank = r && r < 500 ? r : null;
                        return (
                          <td key={d} className="py-2.5 px-2 text-center">
                            {rank ? (
                              <span className={`px-2 py-0.5 rounded-md font-semibold ${
                                rank <= 10 ? "bg-[#f0faf4] text-[#1d7a47]" :
                                rank <= 50 ? "bg-[#fff7e6] text-[#a05c00]" :
                                "bg-[#f5f5f7] text-[#6e6e73]"
                              }`}>{rank}</span>
                            ) : (
                              <span className="text-[#c7c7cc]">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ─── Keyword Rankings ───────────────────────────── */}
      {!isRangeQuery && sortedKws.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[15px] font-semibold text-[#1d1d1f]">キーワード順位</p>
            <KeywordStrategySummary keywords={sortedKws} />
          </div>
          <div className="grid grid-cols-[2fr_120px_1fr_1fr_100px] gap-4 pb-2 border-b border-[#f0f0f0] text-[11px] text-[#86868b] uppercase tracking-wide">
            <span>キーワード</span>
            <span>順位（前回比）</span>
            <span>検索ボリューム</span>
            <span>競合密度</span>
            <span>推奨戦略</span>
          </div>
          <div className="divide-y divide-[#f0f0f0]">
            {sortedKws.map((kw) => (
              <div key={kw.keyword} className="grid grid-cols-[2fr_120px_1fr_1fr_100px] gap-4 py-3.5 items-center">
                <span className="text-[14px] font-medium text-[#1d1d1f]">{kw.keyword}</span>
                <RankCell rank={kw.rank} prevRank={kw.prevRank} />
                <MiniBar value={kw.volume} max={100} color="bg-[#0071e3]" />
                <MiniBar value={kw.difficulty} max={100}
                  color={kw.difficulty != null && kw.difficulty > 70 ? "bg-red-400" : kw.difficulty != null && kw.difficulty > 50 ? "bg-yellow-400" : "bg-emerald-400"} />
                <OpportunityTag kw={kw} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-6 text-[11px] text-[#86868b]">
            <span><span className="inline-block w-2 h-2 rounded-full bg-[#0071e3] mr-1" />検索ボリューム（数値が大きいほど検索数多い）</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />競合密度 低（競合が弱く入りやすい）</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />競合密度 高（強豪が占拠している）</span>
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
