export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { WorkflowTrigger } from "./WorkflowTrigger";
import { ContentGenerator } from "./ContentGenerator";
import { GovernancePanel } from "@/components/GovernancePanel";

function timeAgo(date: Date): string {
  const h = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (h < 1)  return "1時間以内";
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return d === 1 ? "昨日" : `${d}日前`;
}

export default async function SnsAppPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const since7d = new Date(Date.now() - 7 * 86_400_000);

  const [app, recentHits] = await Promise.all([
    db.snsApp.findUnique({ where: { id: appId } }),
    db.egoHit.findMany({
      where: { appId, createdAt: { gte: since7d } },
      orderBy: { score: "desc" },
      take: 100,
    }),
  ]);
  if (!app) notFound();

  const negative = recentHits.filter((h) => h.sentiment === "negative").length;
  const positive = recentHits.filter((h) => h.sentiment === "positive").length;
  const latestHit = recentHits[0];

  return (
    <div>
      {/* Header */}
      <div className="pb-16 border-b border-[#f0f0f0]">
        <p className="text-[13px] text-[#6e6e73] mb-5">
          <Link href="/sns" className="hover:text-[#1d1d1f] transition-colors">SNS</Link>
          {" "}›{" "}
          <span className="text-[#1d1d1f]">{app.name}</span>
        </p>
        <div className="flex items-start justify-between">
          <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight leading-[1.05]">
            {app.name}
          </h1>
          <p className="text-[13px] text-[#1d1d1f] flex items-center gap-1.5 mt-2">
            {app.active
              ? <><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />稼働中</>
              : <span className="text-[#6e6e73]">停止中</span>
            }
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-0 divide-x divide-[#f0f0f0] py-12 border-b border-[#f0f0f0]">
        {[
          { n: recentHits.length, label: "言及 (7日)" },
          { n: negative,          label: "ネガティブ" },
          { n: positive,          label: "ポジティブ" },
        ].map(({ n, label }) => (
          <div key={label} className="px-8 first:pl-0 last:pr-0">
            <p className="text-[48px] font-semibold text-[#1d1d1f] leading-none tracking-tight">{n}</p>
            <p className="text-[13px] text-[#6e6e73] mt-2">{label}</p>
          </div>
        ))}
      </div>

      {/* エゴサ */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight mb-2">エゴサ</h2>
        <p className="text-[13px] text-[#6e6e73] mb-8">
          {latestHit ? `最終収集 ${timeAgo(new Date(latestHit.createdAt))}` : "収集なし"}
        </p>
        <WorkflowTrigger appId={appId} initialActive={app.active} />
      </section>

      {/* コンテンツ生成 */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight mb-2">コンテンツ生成</h2>
        <p className="text-[13px] text-[#6e6e73] mb-8">Claudeが投稿原稿を生成。下書きに即追加されます。</p>
        <ContentGenerator appId={appId} />
      </section>

      {/* ガバナンス */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight mb-2">ガバナンス設定</h2>
        <p className="text-[13px] text-[#6e6e73] mb-8">AI AGENT 行動規範 v0.1 準拠</p>
        <GovernancePanel
          appId={appId}
          domain="sns"
          initialConfig={{
            escalationRules: (app.escalationRules ?? {}) as Record<string, unknown>,
            haltConditions: (app.haltConditions ?? {}) as Record<string, unknown>,
            fallbackBehavior: app.fallbackBehavior ?? "pause",
          }}
        />
      </section>

      {/* 直近ヒット */}
      {recentHits.length > 0 && (
        <section className="py-12">
          <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight mb-8">直近の言及</h2>
          <div className="divide-y divide-[#f0f0f0]">
            {recentHits.slice(0, 10).map((h) => (
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
    </div>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  appstore: "App Store", playstore: "Play Store",
  youtube: "YouTube", x: "X", instagram: "Instagram",
  tiktok: "TikTok", rss: "RSS",
};
