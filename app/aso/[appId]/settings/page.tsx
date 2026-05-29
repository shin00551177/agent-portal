export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { WorkflowTrigger } from "../WorkflowTrigger";
import { GovernancePanel } from "@/components/GovernancePanel";
import { ImageUploadSection } from "../ImageUploadSection";

export default async function AsoSettingsPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await db.asoApp.findUnique({ where: { id: appId } });
  if (!app) notFound();

  // §6 KPI: 今月の実績集計
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  // AuditLog の appId は保存形式が不統一のため、直接モデルを集計する
  const appReportIds = await db.asoReport.findMany({
    where: { appId },
    select: { id: true },
  }).then((rs) => rs.map((r) => r.id));

  const [syncCount, proposalStats, auditLogs] = await Promise.all([
    db.asoReport.count({ where: { appId, createdAt: { gte: monthStart }, date: { not: { startsWith: "range:" } } } }),
    db.proposal.groupBy({
      by: ["status"],
      where: { domain: "aso", targetId: appId, createdAt: { gte: monthStart } },
      _count: { id: true },
    }),
    // targetId が appId のログ（AsoApp操作・analyze）＋ appId に紐づく report のログ
    db.auditLog.findMany({
      where: {
        OR: [
          { targetId: appId },
          { targetId: { in: appReportIds } },
        ],
      },
      orderBy: { performedAt: "desc" },
      take: 20,
    }),
  ]);

  const proposalTotal  = proposalStats.reduce((s, r) => s + r._count.id, 0);
  const approvedCount  = proposalStats.find((r) => r.status === "approved" || r.status === "done")?._count.id ?? 0;
  const rejectedCount  = proposalStats.find((r) => r.status === "rejected")?._count.id ?? 0;
  const approvalRate   = proposalTotal > 0 ? Math.round((approvedCount / (approvedCount + rejectedCount || 1)) * 100) : null;

  const ACTION_LABEL: Record<string, string> = {
    aso_sync:           "データ同期",
    aso_analyze:        "提案生成",
    aso_report_slack:   "Slack送信",
    agent_toggled:      "Agent 切替",
    setting_changed:    "設定変更",
    proposal_approved:  "提案 承認",
    proposal_rejected:  "提案 却下",
    governance_review_sent: "ガバナンスレビュー",
  };

  return (
    <div className="space-y-16 max-w-2xl">
      {/* Workflow toggles */}
      <section>
        <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight mb-1">エージェント</h2>
        <p className="text-[13px] text-[#6e6e73] mb-6">
          各ワークフローの稼働・停止を切り替えます。
        </p>
        <WorkflowTrigger
          appId={appId}
          initialActive={app.active}
          initialWorkflowStates={(app.workflowStates ?? {}) as Record<string, boolean>}
        />
      </section>

      <div className="border-t border-[#f0f0f0]" />

      {/* §6 KPI */}
      <section>
        <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight mb-1">KPI</h2>
        <p className="text-[13px] text-[#6e6e73] mb-6">今月の実績（運用ポリシー §6）</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { n: syncCount,      label: "同期回数" },
            { n: proposalTotal,  label: "生成提案数" },
            { n: approvedCount,  label: "承認数" },
            { n: approvalRate != null ? `${approvalRate}%` : "—", label: "承認率" },
          ].map(({ n, label }) => (
            <div key={label} className="bg-[#f5f5f7] rounded-xl px-4 py-4 text-center">
              <p className="text-[28px] font-semibold text-[#1d1d1f] leading-none">{n}</p>
              <p className="text-[12px] text-[#6e6e73] mt-2">{label}</p>
            </div>
          ))}
        </div>
        {app.consecutiveErrors > 0 && (
          <p className="mt-3 text-[13px] text-amber-600">
            ⚠️ 連続エラー: {app.consecutiveErrors} 回（停止条件: {(app.haltConditions as { maxErrors?: number }).maxErrors ?? 5} 回）
          </p>
        )}
      </section>

      <div className="border-t border-[#f0f0f0]" />

      {/* 適用ルール (読み取り専用) */}
      <section>
        <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight mb-1">適用ルール</h2>
        <p className="text-[13px] text-[#6e6e73] mb-6">
          AI AGENT 行動規範 v0.1 — 分析プロンプトに自動適用されます（変更不可）
        </p>
        <div className="bg-[#f5f5f7] rounded-xl px-4 py-4 space-y-2">
          {[
            "提案は必ず「結果 → 原因分析 → ネクストアクション」の3点セットで構成する",
            "人間（オーナー）の承認なしに直接変更を実行しない。提案形式のみとする",
            "確信度 medium 以上の根拠がある提案のみ生成する（推測のみによる提案は不可）",
            "過去に却下された提案と同じ内容・同じフィールドへの変更を繰り返さない",
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-[11px] font-medium text-[#86868b] mt-0.5 w-4 shrink-0">{i + 1}</span>
              <p className="text-[13px] text-[#1d1d1f]">{rule}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-[#f0f0f0]" />

      {/* Image Upload */}
      <section>
        <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight mb-1">画像・バナー差し替え</h2>
        <p className="text-[13px] text-[#6e6e73] mb-6">
          スクリーンショット・フィーチャーグラフィック・アイコンをストアに直接アップロードします。
        </p>
        <ImageUploadSection
          appId={appId}
          hasIos={!!app.iosId}
          hasAndroid={!!app.googlePlayId}
        />
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
          domain="aso"
          initialConfig={{
            escalationRules: (app.escalationRules ?? {}) as Record<string, unknown>,
            haltConditions:  (app.haltConditions  ?? {}) as Record<string, unknown>,
            fallbackBehavior: app.fallbackBehavior ?? "pause",
            agentMeta:       (app.agentMeta       ?? {}) as Record<string, unknown>,
          }}
        />
      </section>

      <div className="border-t border-[#f0f0f0]" />

      {/* #9 Audit Log */}
      <section>
        <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight mb-1">監査ログ</h2>
        <p className="text-[13px] text-[#6e6e73] mb-6">直近20件（行動規範 #9）</p>
        {auditLogs.length === 0 ? (
          <p className="text-[#6e6e73] text-[13px]">ログなし</p>
        ) : (
          <div className="divide-y divide-[#f0f0f0] border border-[#f0f0f0] rounded-xl overflow-hidden">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between px-4 py-3 gap-4 hover:bg-[#f5f5f7] transition-colors">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#1d1d1f]">
                    {ACTION_LABEL[log.action] ?? log.action}
                  </p>
                  <p className="text-[12px] text-[#86868b] truncate mt-0.5">
                    {log.targetTable} · {log.targetId.slice(0, 12)}…
                  </p>
                </div>
                <p className="text-[12px] text-[#86868b] shrink-0">
                  {new Date(log.performedAt).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
