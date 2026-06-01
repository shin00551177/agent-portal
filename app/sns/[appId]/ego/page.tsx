export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

const SOURCE_LABEL: Record<string, string> = {
  appstore: "App Store", playstore: "Play Store",
  youtube: "YouTube", x: "X", instagram: "Instagram",
  tiktok: "TikTok", rss: "RSS",
};

export default async function EgoPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await db.snsApp.findUnique({ where: { id: appId } });
  if (!app) notFound();

  const egoHits = await db.egoHit.findMany({
    where: { appId, dismissed: false },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const negative = egoHits.filter((h) => h.sentiment === "negative");
  const positive = egoHits.filter((h) => h.sentiment === "positive");
  const buzz     = egoHits.filter((h) => h.category === "buzz");
  const feedback = egoHits.filter((h) => h.category === "feedback");

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">エゴサ</h2>
        <p className="text-[13px] text-[#6e6e73] mt-1">{egoHits.length}件の言及を収集中</p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "合計", n: egoHits.length, color: "text-[#1d1d1f]" },
          { label: "バズ", n: buzz.length, color: "text-emerald-600" },
          { label: "ネガティブ", n: negative.length, color: "text-red-500" },
          { label: "ユーザーFB", n: feedback.length, color: "text-blue-500" },
        ].map(({ label, n, color }) => (
          <div key={label} className="rounded-2xl border border-[#f0f0f0] p-4 text-center">
            <p className={`text-[28px] font-semibold leading-none ${color}`}>{n}</p>
            <p className="text-[11px] text-[#86868b] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* 一覧 */}
      {egoHits.length === 0 ? (
        <div className="py-16 rounded-2xl border border-dashed border-[#d2d2d7] text-center">
          <p className="text-[14px] text-[#6e6e73]">データなし。エゴサを実行してください。</p>
        </div>
      ) : (
        <div className="divide-y divide-[#f0f0f0]">
          {egoHits.map((h) => (
            <a
              key={h.id}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between py-4 gap-6 group"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-[14px] font-medium text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors truncate">
                  {h.title}
                </p>
                {h.snippet && (
                  <p className="text-[12px] text-[#6e6e73] line-clamp-1">{h.snippet}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] text-[#86868b] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
                  {SOURCE_LABEL[h.source] ?? h.source}
                </span>
                {h.sentiment === "negative" && (
                  <span className="text-[11px] text-red-500 bg-red-50 px-2 py-0.5 rounded-full">ネガ</span>
                )}
                {h.category === "buzz" && (
                  <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">バズ</span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
