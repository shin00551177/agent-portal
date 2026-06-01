export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getAppContext } from "@/lib/snsAppContext";

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
    todoItems.push({ urgency: "red", label: `承認待ちの仮説`, href: `/sns/${appId}/hypotheses`, count: pendingHypotheses.length });
  }
  if (unprocessedFeedback > 0) {
    todoItems.push({ urgency: "amber", label: `未処理のユーザーFB`, href: `/sns/${appId}/feedback`, count: unprocessedFeedback });
  }
  if (frequencyRecs.some((r) => !r.acceptedAt)) {
    todoItems.push({ urgency: "amber", label: `投稿頻度レコメンドを確認`, href: `/sns/${appId}/frequency`, count: frequencyRecs.filter((r) => !r.acceptedAt).length });
  }

  const egoAgo = lastEgoHit
    ? (() => {
        const h = Math.floor((Date.now() - new Date(lastEgoHit.createdAt).getTime()) / 3_600_000);
        return h < 1 ? "1時間以内" : h < 24 ? `${h}時間前` : `${Math.floor(h / 24)}日前`;
      })()
    : "未実行";

  return (
    <div className="space-y-8 max-w-3xl">
      {/* App header */}
      <div>
        <p className="text-[11px] text-[#86868b] uppercase tracking-widest mb-1">{appCtx.name} — SNS Agent</p>
        <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">ダッシュボード</h1>
      </div>

      {/* 今やること */}
      <section>
        <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-3">今やること</p>
        {todoItems.length === 0 ? (
          <div className="rounded-2xl border border-[#f0f0f0] px-5 py-4 text-[14px] text-[#6e6e73]">
            {statusDot("bg-emerald-500")} <span className="ml-2">対応が必要なタスクはありません</span>
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
        <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-3">PDCAサイクル現状</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "エゴサ", value: egoAgo, sub: `直近7日 ${neg7d}ネガ / ${pos7d}ポジ`, color: "text-[#1d1d1f]" },
            { label: "仮説", value: `${pendingHypotheses.length}件待機中`, sub: `承認済 ${approvedHypotheses}件`, color: pendingHypotheses.length > 0 ? "text-amber-500" : "text-[#1d1d1f]" },
            { label: "Content-lab送信", value: `${briefedHypotheses}件`, sub: "ブリーフ送信済み", color: "text-[#1d1d1f]" },
            { label: "バズ検知", value: `${buzz7d}件`, sub: "直近7日", color: buzz7d > 0 ? "text-emerald-600" : "text-[#1d1d1f]" },
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
              直近14日のトレンドワード（エゴサから自動抽出）
            </p>
            <Link href={`/sns/${appId}/ego`} className="text-[12px] text-[#079147] hover:underline">
              エゴサ詳細 →
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
            <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest">投稿頻度レコメンド</p>
            <Link href={`/sns/${appId}/frequency`} className="text-[12px] text-[#079147] hover:underline">
              詳細・調整 →
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
          <p className="text-[15px] font-medium text-[#1d1d1f]">仮説は自動生成されます</p>
          <p className="text-[13px] text-[#6e6e73]">毎朝8時・夜20時に投稿頻度に合わせて自動補充されます</p>
          <Link
            href={`/sns/${appId}/frequency`}
            className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium"
          >
            投稿頻度を設定する →
          </Link>
        </section>
      )}
    </div>
  );
}
