export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { KeywordManager } from "./KeywordManager";
import { Button } from "@/components/Button";
import { SyncButton } from "./SyncButton";
import { AsoDataSection } from "./AsoDataSection";
import { StorePreview } from "./StorePreview";
import { StoreImages } from "./StoreImages";
import { StoreAnalytics } from "./StoreAnalytics";
import { ImageUploadSection } from "./ImageUploadSection";
import { AsoChatBot } from "@/components/AsoChatBot";
import { StoreHealthDashboard } from "./StoreHealthDashboard";
import { ReviewsSection } from "./ReviewsSection";
import { PreviewVideosSection } from "./PreviewVideosSection";

export default async function AsoAppPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await db.asoApp.findUnique({
    where: { id: appId },
    include: {
      keywords: { where: { active: true }, orderBy: [{ priority: "asc" }, { keyword: "asc" }] },
    },
  });
  if (!app) notFound();

  const recentReports = await db.asoReport.findMany({
    where: { appId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const releases = await db.asoRelease.findMany({
    where: { appId },
    orderBy: { releaseDate: "desc" },
    take: 5,
  });

  const highCount = app.keywords.filter((k) => k.priority === "high").length;
  const latestReport = recentReports[0];
  const latestData = (latestReport?.data ?? {}) as {
    appMetrics?: { downloads: number | null; revenues: number | null; revenueCurrency: string; ratingsAvg: number | null; ratingsTotal: number | null; appPower: number | null };
    keywords?: { keyword: string; rank: number | null; prevRank: number | null; volume: number | null; difficulty: number | null }[];
    periodFrom?: string;
    periodTo?: string;
    isRangeQuery?: boolean;
    rankingHistory?: Record<string, Record<string, number | null>> | null;
    syncedAt?: string;
  };

  // 承認待ちの ASO 提案を取得
  const pendingProposals = await db.proposal.findMany({
    where: { domain: "aso", targetId: appId, status: { in: ["pending", "approved"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, summary: true, rationale: true, status: true },
  });

  return (
    <div>
      {/* Store Health Dashboard */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <div className="mb-6">
          <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">ストア健全性</h2>
          <p className="text-[13px] text-[#6e6e73] mt-1">全ストア要素のステータス一覧</p>
        </div>
        <StoreHealthDashboard
          appId={appId}
          iosId={app.iosId ?? null}
          googlePlayId={app.googlePlayId ?? null}
          ratingsAvg={latestData.appMetrics?.ratingsAvg ?? null}
        />
      </section>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-0 divide-x divide-[#f0f0f0] py-12 border-b border-[#f0f0f0]">
        {[
          { n: app.keywords.length, label: "キーワード" },
          { n: highCount,           label: "優先度 高" },
          { n: recentReports.length, label: "レポート数" },
        ].map(({ n, label }) => (
          <div key={label} className="px-8 first:pl-0 last:pr-0">
            <p className="text-[48px] font-semibold text-[#1d1d1f] leading-none tracking-tight">{n}</p>
            <p className="text-[13px] text-[#6e6e73] mt-2">{label}</p>
          </div>
        ))}
      </div>

      {/* Apptweak データ + 提案 */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">ASO ダッシュボード</h2>
            {latestReport && (
              <p className="text-[13px] text-[#6e6e73] mt-1">Apptweak データ · 最終同期: {latestReport.date}</p>
            )}
          </div>
          <SyncButton appId={appId} />
        </div>

        {latestData.appMetrics ? (
          <AsoDataSection
            appId={appId}
            periodFrom={latestData.periodFrom ?? latestReport?.date ?? null}
            periodTo={latestData.periodTo ?? latestReport?.date ?? null}
            isRangeQuery={latestData.isRangeQuery ?? false}
            rankingHistory={latestData.rankingHistory ?? null}
            syncedAt={latestData.syncedAt ?? null}
            metrics={latestData.appMetrics ?? null}
            keywords={latestData.keywords ?? []}
            pendingProposals={pendingProposals}
          />
        ) : (
          <div className="py-16 text-center border border-dashed border-[#d2d2d7] rounded-2xl">
            <p className="text-[#6e6e73] text-[15px] mb-2">データ未取得</p>
            <p className="text-[13px] text-[#86868b]">「データ更新」ボタンを押してデータを取得してください</p>
          </div>
        )}
      </section>

      {/* App Store Analytics */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <StoreAnalytics iosId={app.iosId} />
      </section>

      {/* Store Preview + Images */}
      <section className="py-12 border-b border-[#f0f0f0] space-y-10">
        <StorePreview
          iosId={app.iosId}
          googlePlayId={app.googlePlayId}
          ratingsAvg={latestData.appMetrics?.ratingsAvg ?? null}
        />
        <StoreImages
          appId={appId}
          iosId={app.iosId}
          googlePlayId={app.googlePlayId}
        />
        {/* Image upload inline */}
        <div>
          <p className="text-[15px] font-semibold text-[#1d1d1f] mb-4">画像を更新する</p>
          <ImageUploadSection
            appId={appId}
            hasIos={!!app.iosId}
            hasAndroid={!!app.googlePlayId}
          />
        </div>
      </section>

      {/* Preview Videos */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <div className="mb-6">
          <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">App Preview動画</h2>
          <p className="text-[13px] text-[#6e6e73] mt-1">スクリーンショットより高CVRを実現するプレビュー動画</p>
        </div>
        <PreviewVideosSection appId={appId} iosId={app.iosId ?? null} />
      </section>

      {/* Reviews */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <div className="mb-6">
          <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">レビュー管理</h2>
          <p className="text-[13px] text-[#6e6e73] mt-1">iOS・Android のレビューを確認し、AI返信案を生成できます</p>
        </div>
        <ReviewsSection appId={appId} />
      </section>

      {/* Keywords */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">キーワード管理</h2>
          <p className="text-[13px] text-[#6e6e73]">優先度「高」はより頻繁に分析されます</p>
        </div>
        <KeywordManager appId={appId} keywords={app.keywords} />
      </section>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <section className="py-12 border-b border-[#f0f0f0]">
          <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight mb-8">直近レポート</h2>
          <div className="divide-y divide-[#f0f0f0]">
            {recentReports.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-4">
                <span className="text-[15px] text-[#1d1d1f]">{r.date}</span>
                <span className="text-[13px] text-[#6e6e73] flex items-center gap-1.5">
                  {r.slackSent && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                  {r.slackSent ? "Slack送信済み" : "未送信"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Releases */}
      <section className="py-12">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">リリース履歴</h2>
          <AddReleaseButton appId={appId} />
        </div>
        {releases.length === 0 ? (
          <p className="text-[#6e6e73] text-[15px] py-8 text-center border border-dashed border-[#d2d2d7] rounded-xl">
            リリースはまだありません
          </p>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {releases.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-4">
                <div>
                  <span className="text-[15px] font-medium text-[#1d1d1f]">{r.releaseDate}</span>
                  {r.notes && <span className="text-[13px] text-[#6e6e73] ml-4">{r.notes}</span>}
                </div>
                <span className="text-[13px] text-[#6e6e73] flex items-center gap-1.5">
                  {r.effectData && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                  {r.effectData ? "効果測定済み" : "未測定"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      <AsoChatBot appId={appId} />
    </div>
  );
}

function AddReleaseButton({ appId }: { appId: string }) {
  async function addRelease(formData: FormData) {
    "use server";
    const { db } = await import("@/lib/db");
    const releaseDate = formData.get("releaseDate") as string;
    const notes = formData.get("notes") as string;
    if (!releaseDate) return;
    await db.asoRelease.create({ data: { appId, releaseDate, notes: notes || null } });
    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/aso/${appId}`);
  }

  return (
    <form action={addRelease} className="flex gap-2">
      <input
        type="date"
        name="releaseDate"
        required
        className="px-3 py-1.5 bg-[#f5f5f7] rounded-lg text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#079147]"
      />
      <input
        type="text"
        name="notes"
        placeholder="メモ（任意）"
        className="px-3 py-1.5 bg-[#f5f5f7] rounded-lg text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#079147] w-36"
      />
      <Button type="submit" size="sm">追加</Button>
    </form>
  );
}
