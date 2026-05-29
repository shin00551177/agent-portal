export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RefAnalyzeButton } from "./RefAnalyzeButton";

export default async function RefsPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const [app, refs] = await Promise.all([
    db.snsApp.findUnique({ where: { id: appId } }),
    db.snsRefVideo.findMany({
      where: { appId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!app) notFound();

  const analyzedCount = refs.filter((r) => r.analyzed).length;

  const PLATFORM_COLOR: Record<string, string> = {
    TikTok: "bg-black text-white",
    Instagram: "bg-[#e1306c] text-white",
    YouTube: "bg-[#ff0000] text-white",
    X: "bg-[#1d1d1f] text-white",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">
            レファランス動画
          </h2>
          <p className="text-[13px] text-[#6e6e73] mt-1">
            {refs.length}件 / 分析済み {analyzedCount}件
          </p>
        </div>
        <Link
          href={`/sns/${appId}/refs/add`}
          className="px-4 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors"
        >
          + 動画を追加
        </Link>
      </div>

      {refs.length === 0 ? (
        <div className="py-16 rounded-2xl border border-dashed border-[#d2d2d7] text-center">
          <p className="text-[15px] font-medium text-[#1d1d1f]">レファランス動画がありません</p>
          <p className="text-[13px] text-[#6e6e73] mt-1">
            バズ動画のURLを追加してパターンを蓄積しましょう
          </p>
          <Link
            href={`/sns/${appId}/refs/add`}
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium"
          >
            最初の動画を追加
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[#f0f0f0]">
          {refs.map((ref) => (
            <div key={ref.id} className="py-5 flex items-start gap-4">
              {ref.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ref.thumbnail}
                  alt=""
                  className="w-20 h-14 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PLATFORM_COLOR[ref.platform] ?? "bg-[#f5f5f7] text-[#1d1d1f]"}`}>
                    {ref.platform}
                  </span>
                  {ref.analyzed ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      分析済み
                    </span>
                  ) : (
                    <RefAnalyzeButton appId={appId} refId={ref.id} />
                  )}
                </div>
                <p className="text-[14px] font-medium text-[#1d1d1f] truncate">
                  {ref.title ?? ref.account ?? ref.url}
                </p>
                {ref.account && (
                  <p className="text-[12px] text-[#6e6e73]">@{ref.account}</p>
                )}
                <div className="flex gap-4 text-[12px] text-[#86868b]">
                  {ref.views != null && <span>{ref.views.toLocaleString()} 再生</span>}
                  {ref.likes != null && <span>{ref.likes.toLocaleString()} いいね</span>}
                </div>
                {ref.analyzed && ref.aiComment && (
                  <p className="text-[12px] text-[#6e6e73] italic line-clamp-2">
                    {ref.aiComment}
                  </p>
                )}
              </div>
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[#0071e3] hover:underline flex-shrink-0"
              >
                開く
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
