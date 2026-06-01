export const dynamic = "force-dynamic";

import { NavShell } from "@/components/NavShell";
import { db } from "@/lib/db";
import Link from "next/link";

type AgentMeta = {
  taskDescription?: string;
  operatorName?: string;
  approvedAt?: string;
  approverName?: string;
  monthlySavingsHours?: number;
};

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full ${
      active ? "bg-[#f0faf4] text-[#1d7a47]" : "bg-[#f5f5f7] text-[#6e6e73]"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-[#c7c7cc]"}`} />
      {active ? "正常稼働" : "停止中"}
    </span>
  );
}

export default async function SettingsPage() {
  const [snsApps, asoApps] = await Promise.all([
    db.snsApp.findMany({ orderBy: { name: "asc" } }),
    db.asoApp.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Merge into unified agent list
  type AgentRow = {
    id: string; name: string; type: string; href: string;
    active: boolean; meta: AgentMeta; updatedAt?: Date;
  };

  const agents: AgentRow[] = [
    ...snsApps.map((a) => ({
      id: a.id, name: `${a.name} (SNS)`, type: "SNS",
      href: `/sns/${a.id}/settings`,
      active: a.active,
      meta: (a.agentMeta ?? {}) as AgentMeta,
    })),
    ...asoApps.map((a) => ({
      id: a.id, name: `${a.name} (ASO)`, type: "ASO",
      href: `/aso/${a.id}/settings`,
      active: a.active,
      meta: (a.agentMeta ?? {}) as AgentMeta,
    })),
  ];

  const totalSavings = agents.reduce((s, a) => s + (a.meta.monthlySavingsHours ?? 0), 0);
  const activeCount  = agents.filter((a) => a.active).length;

  return (
    <NavShell>
      <div className="max-w-4xl">
        <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight leading-[1.05] mb-2">
          設定
        </h1>
        <p className="text-[15px] text-[#6e6e73] mb-16">Agent Portal の全体設定 · AI AGENT 行動規範 v0.1</p>

        <div className="space-y-16">

          {/* ── §5 Agent台帳 ───────────────────────── */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">Agent台帳</h2>
              <span className="text-[12px] text-[#86868b]">運用ポリシー §5</span>
            </div>
            <p className="text-[13px] text-[#6e6e73] mb-8">
              全社で稼働中のAI Agentの一覧。各Agentの設定ページから台帳情報を更新できます。
            </p>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-0 divide-x divide-[#f0f0f0] py-8 border-y border-[#f0f0f0] mb-8">
              {[
                { n: agents.length,   label: "登録Agent数" },
                { n: activeCount,     label: "正常稼働中" },
                { n: totalSavings,    label: "月間削減工数合計 (h)" },
              ].map(({ n, label }) => (
                <div key={label} className="px-8 first:pl-0 last:pr-0">
                  <p className="text-[36px] font-semibold text-[#1d1d1f] leading-none tracking-tight">{n}</p>
                  <p className="text-[12px] text-[#6e6e73] mt-2">{label}</p>
                </div>
              ))}
            </div>

            {/* Registry table */}
            <div className="divide-y divide-[#f0f0f0]">
              {/* Header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 pb-3 text-[11px] text-[#86868b] uppercase tracking-wide">
                <span>Agent名 / 対象業務</span>
                <span>稼働状態</span>
                <span>運用責任者</span>
                <span>承認者</span>
                <span>月間削減工数</span>
                <span />
              </div>

              {agents.map((agent) => (
                <div
                  key={agent.id + agent.type}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 py-4 items-center"
                >
                  <div>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">{agent.name}</p>
                    <p className="text-[12px] text-[#6e6e73] mt-0.5 truncate">
                      {agent.meta.taskDescription || <span className="text-[#c7c7cc]">未設定</span>}
                    </p>
                  </div>
                  <StatusBadge active={agent.active} />
                  <p className="text-[13px] text-[#1d1d1f]">
                    {agent.meta.operatorName || <span className="text-[#c7c7cc]">—</span>}
                  </p>
                  <div>
                    <p className="text-[13px] text-[#1d1d1f]">
                      {agent.meta.approverName || <span className="text-[#c7c7cc]">—</span>}
                    </p>
                    {agent.meta.approvedAt && (
                      <p className="text-[11px] text-[#86868b] mt-0.5">{agent.meta.approvedAt}</p>
                    )}
                  </div>
                  <p className="text-[13px] text-[#1d1d1f]">
                    {agent.meta.monthlySavingsHours
                      ? `${agent.meta.monthlySavingsHours} h`
                      : <span className="text-[#c7c7cc]">—</span>}
                  </p>
                  <Link
                    href={agent.href}
                    className="text-[12px] text-[#079147] hover:underline shrink-0"
                  >
                    編集
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* ── ガバナンス文書 ─────────────────────── */}
          <section className="border-t border-[#f0f0f0] pt-12">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">ガバナンス</h2>
              <span className="text-[12px] text-[#86868b]">AI AGENT Governance</span>
            </div>
            <p className="text-[13px] text-[#6e6e73] mb-6">
              AI AVATAR CO., LTD. 全社AI AGENT構築・運用のガバナンス文書
            </p>
            <div className="space-y-3">
              {[
                {
                  label: "AI AGENT 行動規範 v0.1",
                  desc: "基本原則(1–7) + 運用規範(8–13) · 2026-05-27 制定",
                  href: "https://www.notion.so/AI-AGENT-v0-1-Phase-1-Code-of-Conduct-Quy-t-c-ng-x-36d9a37c48cc81ec866ce5c72ef2a13e",
                },
                {
                  label: "AI Agent 運用ポリシー",
                  desc: "承認フロー · 台帳管理 · 報奨金 · 廃止ルール",
                  href: "https://www.notion.so/AI-Agent-36e9a37c48cc8119a503db8e4b8d2e52",
                },
              ].map(({ label, desc, href }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-4 bg-[#f5f5f7] hover:bg-[#ebebeb] rounded-xl transition-colors group"
                >
                  <div>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">{label}</p>
                    <p className="text-[12px] text-[#6e6e73] mt-0.5">{desc}</p>
                  </div>
                  <span className="text-[13px] text-[#079147] group-hover:underline">開く →</span>
                </a>
              ))}
            </div>
          </section>

          {/* ── バージョン ────────────────────────── */}
          <section className="border-t border-[#f0f0f0] pt-12">
            <p className="text-[13px] text-[#86868b]">
              Agent Portal · 行動規範 v0.1 · 2026
            </p>
          </section>

        </div>
      </div>
    </NavShell>
  );
}
