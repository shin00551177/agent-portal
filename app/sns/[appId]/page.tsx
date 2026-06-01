export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getAppContext } from "@/lib/snsAppContext";
import { getSnsT } from "@/lib/i18n/sns";

function statusDot(color: string) {
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await db.snsApp.findUnique({ where: { id: appId } });
  if (!app) notFound();

  const appCtx = getAppContext(appId);
  const locale = (app as { locale?: string }).locale ?? "ja";
  const t = getSnsT(locale).dashboard;
  const since7d  = new Date(Date.now() - 7  * 86_400_000);
  const since14d = new Date(Date.now() - 14 * 86_400_000);

  const [
    pendingHypotheses,
    approvedHypotheses,
    briefedHypotheses,
    unprocessedFeedback,
    recentHits,
    frequencyRecs,
    lastEgoHit,
  ] = await Promise.all([
    db.snsHypothesis.findMany({ where: { appId, status: "pending" }, orderBy: { createdAt: "desc" } }),
    db.snsHypothesis.count({ where: { appId, status: "approved" } }),
    db.snsHypothesis.count({ where: { appId, status: "briefed" } }),
    db.snsProductFeedback.count({ where: { appId, processed: false } }),
    db.egoHit.findMany({ where: { appId, createdAt: { gte: since14d } }, orderBy: { score: "desc" }, take: 100 }),
    db.snsFrequencyRecommendation.findMany({ where: { appId } }),
    db.egoHit.findFirst({ where: { appId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  const neg7d = recentHits.filter((h) => new Date(h.createdAt) >= since7d && h.sentiment === "negative").length;
  const pos7d = recentHits.filter((h) => new Date(h.createdAt) >= since7d && h.sentiment === "positive").length;
  const buzz7d = recentHits.filter((h) => new Date(h.createdAt) >= since7d && h.category === "buzz").length;

  // 簡易トレンド抽出（EgoHitのタイトルから頻出フレーズをカウント）
  const wordCount: Record<string, number> = {};
  recentHits.forEach((h) => {
    h.title.split(/[\s　、。！？・「」『』【】（）]/u)
      .filter((w) => w.length >= 2 && w.length <= 10)
      .forEach((w) => { wordCount[w] = (wordCount[w] ?? 0) + 1; });
  });
  const trends = Object.entries(wordCount)
    .filter(([, c]) => c >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([word, count]) => ({ word, count }));

  // 「今やること」
  const todoItems: { urgency: "red" | "amber"; label: string; href: string; count: number }[] = [];
  if (pendingHypotheses.length > 0) {
    todoItems.push({ urgency: "red", label: t.pending, href: `/sns/${appId}/hypotheses`, count: pendingHypotheses.length });
  }
  if (unprocessedFeedback > 0) {
    todoItems.push({ urgency: "amber", label: t.unprocessed, href: `/sns/${appId}/feedback`, count: unprocessedFeedback });
  }
  if (frequencyRecs.some((r) => !r.acceptedAt)) {
    todoItems.push({ urgency: "amber", label: t.freqCheck, href: `/sns/${appId}/frequency`, count: frequencyRecs.filter((r) => !r.acceptedAt).length });
  }

  const egoAgo = lastEgoHit
    ? (() => {
        const h = Math.floor((Date.now() - new Date(lastEgoHit.createdAt).getTime()) / 3_600_000);
        if (locale === "pt-BR") {
          return h < 1 ? "Há menos de 1h" : h < 24 ? `Há ${h}h` : `Há ${Math.floor(h / 24)} dias`;
        }
        return h < 1 ? "1時間以内" : h < 24 ? `${h}時間前` : `${Math.floor(h / 24)}日前`;
      })()
    : t.egoNotRun;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* App header */}
      <div>
        <p className="text-[11px] text-[#86868b] uppercase tracking-widest mb-1">{appCtx.name} — SNS Agent</p>
        <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">{t.title}</h1>
      </div>

      {/* 今やること */}
      <section>
        <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-3">{t.todo}</p>
        {todoItems.length === 0 ? (
          <div className="rounded-2xl border border-[#f0f0f0] px-5 py-4 text-[14px] text-[#6e6e73]">
            {statusDot("bg-emerald-500")} <span className="ml-2">{t.noTodo}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {todoItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-2xl border border-[#f0f0f0] px-5 py-4 hover:bg-[#f9f9f9] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  {statusDot(item.urgency === "red" ? "bg-red-500 animate-pulse" : "bg-amber-400 animate-pulse")}
                  <span className="text-[14px] font-medium text-[#1d1d1f]">{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[13px] font-semibold px-2 py-0.5 rounded-full ${
                    item.urgency === "red" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                  }`}>{item.count}件</span>
                  <span className="text-[#c7c7cc] group-hover:translate-x-0.5 transition-transform">›</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* PDCAサイクル現状 */}
      <section>
        <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-3">{t.pdca}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t.pdcaCards.ego, value: egoAgo, sub: t.pdcaSubs.egoSub(neg7d, pos7d), color: "text-[#1d1d1f]" },
            { label: t.pdcaCards.hypothesis, value: `${pendingHypotheses.length}`, sub: t.pdcaSubs.hypoSub(approvedHypotheses), color: pendingHypotheses.length > 0 ? "text-amber-500" : "text-[#1d1d1f]" },
            { label: t.pdcaCards.contentLab, value: `${briefedHypotheses}`, sub: t.pdcaSubs.briefSub, color: "text-[#1d1d1f]" },
            { label: t.pdcaCards.buzz, value: `${buzz7d}`, sub: t.pdcaSubs.buzzSub, color: buzz7d > 0 ? "text-emerald-600" : "text-[#1d1d1f]" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-2xl border border-[#f0f0f0] p-4">
              <p className="text-[10px] text-[#86868b] uppercase tracking-wide mb-2">{label}</p>
              <p className={`text-[18px] font-semibold leading-tight ${color}`}>{value}</p>
              <p className="text-[11px] text-[#86868b] mt-1">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* トレンド */}
      {trends.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest">
              {t.trends}
            </p>
            <Link href={`/sns/${appId}/ego`} className="text-[12px] text-[#079147] hover:underline">
              {t.egoDetail}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {trends.map(({ word, count }) => (
              <span
                key={word}
                className="text-[12px] px-3 py-1.5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] font-medium"
              >
                {word}
                <span className="ml-1.5 text-[10px] text-[#86868b]">{count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 投稿頻度レコメンド */}
      {frequencyRecs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest">{t.frequency}</p>
            <Link href={`/sns/${appId}/frequency`} className="text-[12px] text-[#079147] hover:underline">
              {t.freqDetail}
            </Link>
          </div>
          <div className="rounded-2xl border border-[#f0f0f0] divide-y divide-[#f0f0f0]">
            {frequencyRecs.map((r) => {
              const effective = r.adjustedFrequency ?? r.recommendedFrequency;
              const changed = r.currentFrequency !== null && r.currentFrequency !== effective;
              return (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium text-[#1d1d1f] capitalize">{r.platform}</span>
                    {!r.acceptedAt && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">要確認</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    {r.currentFrequency !== null && (
                      <span className="text-[#86868b]">現在 週{r.currentFrequency}回</span>
                    )}
                    <span className="text-[#c7c7cc]">→</span>
                    <span className={`font-semibold ${changed ? "text-emerald-600" : "text-[#1d1d1f]"}`}>
                      週{effective}回
                    </span>
                    {changed && <span className="text-[10px] text-emerald-600">AI推奨</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 仮説がない場合のCTA */}
      {pendingHypotheses.length === 0 && frequencyRecs.length === 0 && (
        <section className="py-10 rounded-2xl border border-dashed border-[#d2d2d7] text-center space-y-3">
          <p className="text-[15px] font-medium text-[#1d1d1f]">{t.emptyTitle}</p>
          <p className="text-[13px] text-[#6e6e73]">{t.emptyDesc}</p>
          <Link
            href={`/sns/${appId}/frequency`}
            className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium"
          >
            {t.emptyLink}
          </Link>
        </section>
      )}
    </div>
  );
}
