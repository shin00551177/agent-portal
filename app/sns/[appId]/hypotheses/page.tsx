"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Hypothesis = {
  id: string;
  platform: string;
  hypothesis: string;
  reasoning: string;
  targetAudience: string | null;
  format: string | null;
  contentBrief: string | null;
  status: string;
  rejectionNote: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: "承認待ち",        cls: "bg-amber-50 text-amber-600 border-amber-200" },
  approved:  { label: "承認済み",        cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  rejected:  { label: "差し戻し",        cls: "bg-red-50 text-red-500 border-red-200" },
  briefed:   { label: "Content-lab送信済", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  posted:    { label: "投稿済み",        cls: "bg-purple-50 text-purple-600 border-purple-200" },
  measured:  { label: "測定済み",        cls: "bg-gray-50 text-gray-500 border-gray-200" },
};

const TABS = ["すべて", "pending", "approved", "briefed", "posted"] as const;
type Tab = typeof TABS[number];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-[11px] text-[#0071e3] hover:underline"
    >{copied ? "コピー済" : "コピー"}</button>
  );
}

export default function HypothesesPage() {
  const { appId } = useParams<{ appId: string }>();
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  async function load() {
    const res = await fetch(`/api/sns/${appId}/hypotheses`);
    if (res.ok) setHypotheses(await res.json());
  }
  useEffect(() => { load(); }, [appId]);

  async function generate() {
    setGenerating(true);
    setGenMessage(null);
    const res = await fetch(`/api/sns/${appId}/hypotheses/generate`, { method: "POST" });
    const data = await res.json();
    setGenerating(false);
    if (res.ok) {
      setGenMessage(data.message ?? `${data.hypotheses?.length ?? 0}件生成しました`);
      await load();
      setActiveTab("pending");
    }
  }

  async function updateStatus(id: string, status: string, extra?: object) {
    await fetch(`/api/sns/${appId}/hypotheses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extra }),
    });
    await load();
  }

  async function submitReject(id: string) {
    await updateStatus(id, "rejected", { rejectionNote: rejectNote });
    setRejectingId(null);
    setRejectNote("");
  }

  const filtered = activeTab === "すべて"
    ? hypotheses
    : hypotheses.filter((h) => h.status === activeTab);

  const pendingCount = hypotheses.filter((h) => h.status === "pending").length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">仮説管理</h2>
          <p className="text-[13px] text-[#6e6e73] mt-1">
            AIが投稿頻度に合わせて自動生成します。承認・差し戻しをしてください。
          </p>
          {genMessage && (
            <p className="text-[12px] text-[#86868b] mt-1">{genMessage}</p>
          )}
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="px-4 py-2 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium hover:bg-[#ebebeb] disabled:opacity-40 transition-colors flex-shrink-0"
        >
          {generating ? "生成中..." : "今すぐ生成"}
        </button>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-[#ebebeb] rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              activeTab === tab ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            {tab === "すべて" ? "すべて" : (STATUS_LABEL[tab]?.label ?? tab)}
            {tab === "pending" && pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 仮説一覧 */}
      {filtered.length === 0 ? (
        <div className="py-16 rounded-2xl border border-dashed border-[#d2d2d7] text-center">
          <p className="text-[14px] text-[#6e6e73]">
            {activeTab === "pending" ? "承認待ちの仮説がありません。「仮説を生成」を押してください。" : "該当する仮説がありません"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((h) => {
            const st = STATUS_LABEL[h.status] ?? { label: h.status, cls: "bg-gray-50 text-gray-500 border-gray-200" };
            const isOpen = expanded === h.id;
            return (
              <div key={h.id} className="rounded-2xl border border-[#f0f0f0] overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : h.id)}
                  className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-[#fafafa] transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-[#86868b] capitalize">{h.platform}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-[14px] font-medium text-[#1d1d1f] leading-snug">{h.hypothesis}</p>
                    {!isOpen && (
                      <p className="text-[12px] text-[#6e6e73] line-clamp-1">{h.reasoning}</p>
                    )}
                  </div>
                  <span className="text-[#86868b] text-[13px] flex-shrink-0 mt-1">{isOpen ? "▲" : "▼"}</span>
                </button>

                {/* 詳細 */}
                {isOpen && (
                  <div className="border-t border-[#f0f0f0] px-5 py-4 space-y-4 text-[13px]">
                    <div>
                      <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-1">根拠</p>
                      <p className="text-[#1d1d1f] leading-relaxed">{h.reasoning}</p>
                    </div>
                    {h.targetAudience && (
                      <div>
                        <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-1">ターゲット</p>
                        <p>{h.targetAudience}</p>
                      </div>
                    )}
                    {h.format && (
                      <div>
                        <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-1">フォーマット</p>
                        <p>{h.format}</p>
                      </div>
                    )}
                    {h.contentBrief && (
                      <div>
                        <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-1">
                          Content-lab ブリーフ <CopyBtn text={h.contentBrief} />
                        </p>
                        <p className="whitespace-pre-wrap bg-[#f5f5f7] rounded-xl px-4 py-3 leading-relaxed">{h.contentBrief}</p>
                      </div>
                    )}
                    {h.rejectionNote && (
                      <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                        <p className="text-[11px] font-semibold text-red-500 mb-1">差し戻しメモ</p>
                        <p className="text-red-600">{h.rejectionNote}</p>
                      </div>
                    )}

                    {/* アクション */}
                    {h.status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => updateStatus(h.id, "approved")}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-[13px] font-medium hover:bg-emerald-600 transition-colors"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => setRejectingId(h.id)}
                          className="flex-1 py-2.5 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium hover:bg-[#ebebeb] transition-colors"
                        >
                          差し戻し
                        </button>
                      </div>
                    )}
                    {h.status === "approved" && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => updateStatus(h.id, "briefed", { briefSentAt: new Date().toISOString() })}
                          className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-[13px] font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                        >
                          Content-lab に送信
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">実装待ち</span>
                        </button>
                      </div>
                    )}
                    {h.status === "briefed" && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => updateStatus(h.id, "posted", { postedAt: new Date().toISOString() })}
                          className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white text-[13px] font-medium hover:bg-purple-600 transition-colors"
                        >
                          投稿済みとしてマーク
                        </button>
                      </div>
                    )}

                    {/* 差し戻しフォーム */}
                    {rejectingId === h.id && (
                      <div className="space-y-2 pt-2">
                        <textarea
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder="差し戻し理由・改善メモ（AIが次回の仮説生成に活用します）"
                          rows={3}
                          className="w-full px-3 py-2.5 rounded-xl border border-[#d2d2d7] text-[13px] resize-none focus:outline-none focus:border-[#1d1d1f]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => submitReject(h.id)}
                            className="flex-1 py-2 rounded-xl bg-[#1d1d1f] text-white text-[13px] font-medium"
                          >
                            差し戻す
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectNote(""); }}
                            className="px-4 py-2 rounded-xl bg-[#f5f5f7] text-[#6e6e73] text-[13px]"
                          >
                            キャンセル
                          </button>
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
