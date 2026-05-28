export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { WorkflowTrigger } from "../WorkflowTrigger";
import { GovernancePanel } from "@/components/GovernancePanel";

export default async function SnsSettingsPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await db.snsApp.findUnique({ where: { id: appId } });
  if (!app) notFound();

  return (
    <div className="space-y-16 max-w-2xl">
      {/* Agent toggle */}
      <section>
        <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight mb-1">エージェント</h2>
        <p className="text-[13px] text-[#6e6e73] mb-6">エゴサの自動収集を稼働・停止します。</p>
        <WorkflowTrigger appId={appId} initialActive={app.active} />
      </section>

      <div className="border-t border-[#f0f0f0]" />

      {/* Governance */}
      <section>
        <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight mb-1">ガバナンス設定</h2>
        <p className="text-[13px] text-[#6e6e73] mb-6">
          AI AGENT 行動規範 v0.1 — エスカレーション・停止条件・フォールバック動作
        </p>
        <GovernancePanel
          appId={appId}
          appName={app.name}
          domain="sns"
          initialConfig={{
            escalationRules: (app.escalationRules ?? {}) as Record<string, unknown>,
            haltConditions:  (app.haltConditions  ?? {}) as Record<string, unknown>,
            fallbackBehavior: app.fallbackBehavior ?? "pause",
            agentMeta:       (app.agentMeta       ?? {}) as Record<string, unknown>,
          }}
        />
      </section>
    </div>
  );
}
