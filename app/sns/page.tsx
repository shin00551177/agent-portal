export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";

function timeAgo(date: Date): string {
  const h = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (h < 1)  return "1時間以内";
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return d === 1 ? "昨日" : `${d}日前`;
}

export default async function SnsPage() {
  const since7d = new Date(Date.now() - 7 * 86_400_000);

  const [apps, pendingProposals, recentHits] = await Promise.all([
    db.snsApp.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    db.proposal.count({ where: { status: "pending", domain: "ego" } }),
    db.egoHit.findMany({
      where: { createdAt: { gte: since7d } },
      orderBy: { score: "desc" },
      take: 200,
    }),
  ]);

  // 集計
  const total     = recentHits.length;
  const negative  = recentHits.filter((h) => h.sentiment === "negative").length;
  const positive  = recentHits.filter((h) => h.sentiment === "positive").length;
  const buzz      = recentHits.filter((h) => h.category === "buzz").length;
  const reviews   = recentHits.filter((h) => h.source === "appstore" || h.source === "playstore").length;

  // per-app サマリー
  const hitsByApp = apps.map((app) => {
    const hits    = recentHits.filter((h) => h.appId === app.id);
    const neg     = hits.filter((h) => h.sentiment === "negative").length;
    const latest  = hits[0]?.createdAt;
    return { ...app, hitCount: hits.length, negCount: neg, latest };
  });

  // top negative hits (全アプリ横断)
  const topNegative = recentHits
    .filter((h) => h.sentiment === "negative")
    .slice(0, 5);

  return (
    <>
      <div className="pb-10 border-b border-[#f0f0f0]">
        <p className="text-[13px] text-[#6e6e73] uppercase tracking-wide mb-4">SNS</p>
        <h1 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
          SNS エージェント
        </h1>
        <p className="text-[15px] text-[#6e6e73] mt-2">エゴサ · コンテンツ生成 · 直近7日間</p>
        {pendingProposals > 0 && (
          <Link
            href="/proposals?domain=ego"
            className="inline-flex items-center gap-2 mt-6 text-[15px] text-[#0071e3] hover:underline"
          >
            <span className="w-2 h-2 bg-[#0071e3] rounded-full animate-pulse" />
            エゴサ提案 {pendingProposals}件 承認待ち →
          </Link>
        )}
      </div>

      {/* 全体サマリー */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <div className="grid grid-cols-4 divide-x divide-[#f0f0f0]">
          {[
            { n: total,    label: "合計" },
            { n: negative, label: "ネガティブ" },
            { n: positive, label: "ポジティブ" },
            { n: buzz,     label: "バズ" },
          ].map(({ n, label }) => (
            <div key={label} className="px-6 first:pl-0 last:pr-0">
              <p className="text-[40px] font-semibold text-[#1d1d1f] leading-none">{n}</p>
              <p className="text-[13px] text-[#6e6e73] mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* アプリ別 */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <p className="text-[13px] text-[#6e6e73] uppercase tracking-wide mb-6">アプリ別</p>
        <div className="divide-y divide-[#f0f0f0]">
          {hitsByApp.map((app) => (
            <Link
              key={app.id}
              href={`/sns/${app.id}`}
              className="flex items-center justify-between py-4 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center flex-shrink-0">
                  <span className="text-[14px] font-semibold text-[#1d1d1f]">{app.name[0]}</span>
                </div>
                <div>
                  <p className="text-[15px] font-medium text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
                    {app.name}
                  </p>
                  <p className="text-[12px] text-[#86868b]">
                    {app.latest ? timeAgo(new Date(app.latest)) : "データなし"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {app.hitCount > 0 ? (
                  <>
                    <span className="text-[15px] font-medium text-[#1d1d1f]">{app.hitCount}件</span>
                    {app.negCount > 0 && (
                      <span className="text-[13px] text-red-500">{app.negCount} 要対応</span>
                    )}
                  </>
                ) : (
                  <span className="text-[13px] text-[#86868b]">収集なし</span>
                )}
                <span className="text-[#6e6e73] text-[20px] font-light group-hover:translate-x-0.5 transition-transform">›</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* トップ ネガティブ */}
      {topNegative.length > 0 && (
        <section className="py-12">
          <p className="text-[13px] text-[#6e6e73] uppercase tracking-wide mb-6">要対応 — ネガティブ上位</p>
          <div className="divide-y divide-[#f0f0f0]">
            {topNegative.map((h) => (
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
                  {h.feedbackType && (
                    <span className="text-[12px] text-[#86868b] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
                      {FEEDBACK_LABEL[h.feedbackType] ?? h.feedbackType}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <div className="py-20 text-center">
          <p className="text-[17px] text-[#6e6e73]">直近7日間のデータなし</p>
          <p className="text-[14px] text-[#86868b] mt-2">Ego Searchを実行するとここに表示されます</p>
        </div>
      )}
    </>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  appstore: "App Store", playstore: "Play Store",
  youtube: "YouTube", x: "X", instagram: "Instagram",
  tiktok: "TikTok", rss: "RSS",
};

const FEEDBACK_LABEL: Record<string, string> = {
  bug: "バグ", feature_request: "要望", praise: "称賛", comparison: "比較",
};
