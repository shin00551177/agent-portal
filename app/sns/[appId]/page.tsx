export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { PendingReviewPanel } from "./PendingReviewPanel";
import { ManualGenerateSection } from "./ManualGenerateSection";

const SOURCE_LABEL: Record<string, string> = {
  appstore: "App Store", playstore: "Play Store",
  youtube: "YouTube", x: "X", instagram: "Instagram",
  tiktok: "TikTok", rss: "RSS",
};

function timeAgo(date: Date): string {
  const h = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (h < 1)  return "1時間以内";
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return d === 1 ? "昨日" : `${d}日前`;
}

// ── PDCA phase card ────────────────────────────────────
type PhaseStatus = "active" | "needs_review" | "pending_api" | "todo" | "stopped";

function PhaseCard({
  step, label, status, summary, detail, href,
}: {
  step: string; label: string; status: PhaseStatus;
  summary: string; detail: string; href?: string;
}) {
  const dot: Record<PhaseStatus, string> = {
    active:       "bg-emerald-500",
    needs_review: "bg-amber-400 animate-pulse",
    pending_api:  "bg-[#c7c7cc]",
    stopped:      "bg-red-400",
    todo:         "bg-[#c7c7cc]",
  };
  const border: Record<PhaseStatus, string> = {
    active:       "border-[#f0f0f0]",
    needs_review: "border-amber-300 bg-[#fffbf0]",
    pending_api:  "border-[#f0f0f0]",
    stopped:      "border-red-200",
    todo:         "border-[#f0f0f0] opacity-50",
  };

  const inner = (
    <div className={`rounded-2xl border p-4 space-y-3 h-full ${border[status]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wide">{step}</span>
        <span className={`w-2 h-2 rounded-full ${dot[status]}`} />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-[#1d1d1f]">{label}</p>
        <p className="text-[20px] font-semibold text-[#1d1d1f] mt-1 leading-tight">{summary}</p>
        <p className="text-[11px] text-[#6e6e73] mt-1 leading-snug">{detail}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group hover:scale-[1.01] transition-transform duration-150">
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

// ── Page ───────────────────────────────────────────────
export default async function SnsAppPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const since7d = new Date(Date.now() - 7 * 86_400_000);

  const [app, recentHits, pendingDrafts, approvedCount, latestDraft] = await Promise.all([
    db.snsApp.findUnique({ where: { id: appId } }),
    db.egoHit.findMany({
      where: { appId, createdAt: { gte: since7d } },
      orderBy: { score: "desc" },
      take: 100,
    }),
    db.snsDraft.findMany({
      where: { appId, status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
    db.snsDraft.count({ where: { appId, status: "approved" } }),
    db.snsDraft.findFirst({
      where: { appId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  if (!app) notFound();

  const negative = recentHits.filter((h) => h.sentiment === "negative").length;
  const positive = recentHits.filter((h) => h.sentiment === "positive").length;

  return (
    <div className="space-y-12">

      {/* ── PDCA フェーズ ──────────────────────────── */}
      <section>
        <p className="text-[11px] text-[#86868b] uppercase tracking-widest mb-4">
          自動化ループ — George 4-Step PDCA
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PhaseCard
            step="Step 1"
            label="レポート"
            status={app.active ? "active" : "stopped"}
            summary={`${recentHits.length}件`}
            detail={`7日間 ／ ネガ ${negative} · ポジ ${positive}`}
            href={`/sns/${appId}/ego`}
          />
          <PhaseCard
            step="Step 2"
            label="改善策考案"
            status={pendingDrafts.length > 0 ? "needs_review" : "active"}
            summary={
              pendingDrafts.length > 0
                ? `${pendingDrafts.length}件 承認待ち`
                : "提案なし"
            }
            detail={
              latestDraft
                ? `最終生成: ${timeAgo(new Date(latestDraft.createdAt))}`
                : "次回: 明日 08:00"
            }
            href={`/sns/${appId}/drafts`}
          />
          <PhaseCard
            step="Step 3"
            label="改善実施"
            status="pending_api"
            summary={`${approvedCount}件`}
            detail="承認済み ／ Meta・TikTok API 接続待ち"
          />
          <PhaseCard
            step="Step 4"
            label="測定"
            status="todo"
            summary="準備中"
            detail="投稿パフォーマンス集計"
          />
        </div>
      </section>

      {/* ── 承認待ちの投稿提案 ─────────────────────── */}
      {pendingDrafts.length > 0 ? (
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">
                承認待ちの投稿提案
              </h2>
              <p className="text-[13px] text-[#6e6e73] mt-1">
                Agentが生成しました。承認・却下を選んでください（行動規範 原則6）
              </p>
            </div>
            <Link
              href={`/sns/${appId}/drafts`}
              className="text-[13px] text-[#0071e3] hover:underline"
            >
              全ての下書き →
            </Link>
          </div>
          <PendingReviewPanel appId={appId} initialDrafts={pendingDrafts} />
        </section>
      ) : (
        <section className="py-8 rounded-2xl border border-dashed border-[#d2d2d7] text-center">
          <p className="text-[15px] font-medium text-[#1d1d1f]">承認待ちの提案はありません</p>
          <p className="text-[13px] text-[#6e6e73] mt-1">
            次回自動生成は毎朝 08:00。手動で追加生成することもできます。
          </p>
        </section>
      )}

      {/* ── 直近の言及 ────────────────────────────── */}
      {recentHits.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">
              直近の言及
            </h2>
            <Link
              href={`/sns/${appId}/ego`}
              className="text-[13px] text-[#0071e3] hover:underline"
            >
              全て見る →
            </Link>
          </div>
          <div className="divide-y divide-[#f0f0f0]">
            {recentHits.slice(0, 5).map((h) => (
              <a
                key={h.id}
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between py-4 gap-6 group"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors truncate">
                    {h.title}
                  </p>
                  {h.snippet && (
                    <p className="text-[12px] text-[#6e6e73] mt-0.5 line-clamp-1">{h.snippet}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[12px] text-[#86868b] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
                    {SOURCE_LABEL[h.source] ?? h.source}
                  </span>
                  {h.sentiment === "negative" && (
                    <span className="text-[12px] text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                      ネガティブ
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── 手動追加生成（折りたたみ） ─────────────── */}
      <ManualGenerateSection appId={appId} />

    </div>
  );
}
