export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PatternGenerateButton } from "./PatternGenerateButton";

const TYPE_COLOR: Record<string, string> = {
  フック型: "bg-blue-100 text-blue-700",
  構成型:   "bg-purple-100 text-purple-700",
  CTA型:    "bg-green-100 text-green-700",
  BGM型:    "bg-orange-100 text-orange-700",
  映像型:   "bg-pink-100 text-pink-700",
};

export default async function PatternsPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const [app, patterns, analyzedCount] = await Promise.all([
    db.snsApp.findUnique({ where: { id: appId } }),
    db.snsPattern.findMany({ where: { appId }, orderBy: { patternType: "asc" } }),
    db.snsRefVideo.count({ where: { appId, analyzed: true } }),
  ]);
  if (!app) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">
            成功パターン
          </h2>
          <p className="text-[13px] text-[#6e6e73] mt-1">
            {patterns.length}件のパターン ／ レファランス分析済み {analyzedCount}件から抽出
          </p>
        </div>
        <PatternGenerateButton appId={appId} disabled={analyzedCount === 0} />
      </div>

      {analyzedCount === 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-700">
          まず<Link href={`/sns/${appId}/refs`} className="underline font-medium">レファランス動画</Link>を追加・分析してください。分析済み動画からパターンが抽出されます。
        </div>
      )}

      {patterns.length === 0 && analyzedCount > 0 ? (
        <div className="py-16 rounded-2xl border border-dashed border-[#d2d2d7] text-center">
          <p className="text-[15px] font-medium text-[#1d1d1f]">パターンがありません</p>
          <p className="text-[13px] text-[#6e6e73] mt-1">
            「パターンを生成」ボタンで分析済み動画からパターンを抽出します
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {patterns.map((p) => {
            const hooks = Array.isArray(p.exampleHooks) ? (p.exampleHooks as string[]) : [];
            return (
              <div key={p.id} className="rounded-2xl border border-[#f0f0f0] p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-semibold text-[#1d1d1f] leading-snug">{p.title}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_COLOR[p.patternType] ?? "bg-[#f5f5f7] text-[#6e6e73]"}`}>
                    {p.patternType}
                  </span>
                </div>
                <p className="text-[12px] text-[#6e6e73] leading-relaxed">{p.description}</p>
                {hooks.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">フック例</p>
                    {hooks.map((h, i) => (
                      <p key={i} className="text-[12px] text-[#1d1d1f] bg-[#f5f5f7] rounded-lg px-3 py-1.5">
                        {h}
                      </p>
                    ))}
                  </div>
                )}
                {(p.platform || p.targetAge) && (
                  <div className="flex gap-2 text-[11px] text-[#86868b]">
                    {p.platform && <span>{p.platform}</span>}
                    {p.targetAge && <span>/ {p.targetAge}</span>}
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
