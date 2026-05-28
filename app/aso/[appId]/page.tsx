export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { KeywordManager } from "./KeywordManager";
import { WorkflowTrigger } from "./WorkflowTrigger";
import { GovernancePanel } from "@/components/GovernancePanel";
import Link from "next/link";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await db.asoApp.findUnique({
    where: { id: appId },
    include: { keywords: { where: { active: true }, orderBy: [{ priority: "asc" }, { keyword: "asc" }] } },
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

  return (
    <div>
      {/* Header */}
      <div className="pb-16 border-b border-[#f0f0f0]">
        <p className="text-[13px] text-[#6e6e73] mb-5">
          <Link href="/aso" className="hover:text-[#1d1d1f] transition-colors">ASO管理</Link>
          {" "}›{" "}
          <span className="text-[#1d1d1f]">{app.name}</span>
        </p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight leading-[1.05]">{app.name}</h1>
            <p className="text-[15px] text-[#6e6e73] mt-2">
              {[app.googlePlayId && `Android: ${app.googlePlayId}`, app.iosId && `iOS: ${app.iosId}`].filter(Boolean).join(" · ")}
            </p>
          </div>
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

      {/* Workflows */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight mb-8">エージェント</h2>
        <WorkflowTrigger
          appId={appId}
          initialActive={app.active}
          initialWorkflowStates={(app.workflowStates ?? {}) as Record<string, boolean>}
        />
      </section>

      {/* Keywords */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">キーワード管理</h2>
          <p className="text-[13px] text-[#6e6e73]">優先度「高」はより頻繁に分析されます</p>
        </div>
        <KeywordManager appId={appId} keywords={app.keywords} />
      </section>

      {/* ガバナンス */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight mb-2">ガバナンス設定</h2>
        <p className="text-[13px] text-[#6e6e73] mb-8">AI AGENT 行動規範 v0.1 準拠</p>
        <GovernancePanel
          appId={appId}
          domain="aso"
          initialConfig={{
            escalationRules: (app.escalationRules ?? {}) as Record<string, unknown>,
            haltConditions: (app.haltConditions ?? {}) as Record<string, unknown>,
            fallbackBehavior: app.fallbackBehavior ?? "pause",
          }}
        />
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
        className="px-3 py-1.5 bg-[#f5f5f7] rounded-lg text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
      />
      <input
        type="text"
        name="notes"
        placeholder="メモ（任意）"
        className="px-3 py-1.5 bg-[#f5f5f7] rounded-lg text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] w-36"
      />
      <button
        type="submit"
        className="px-4 py-1.5 bg-[#1d1d1f] hover:bg-black rounded-lg text-[13px] text-white font-medium transition-colors"
      >
        追加
      </button>
    </form>
  );
}
