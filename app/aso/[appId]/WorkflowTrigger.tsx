"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const WORKFLOWS = [
  {
    id: "weekly_report",
    label: "週次レポート",
    description: "キーワード順位の週次推移をSlackに通知。毎週月曜自動実行。",
  },
  {
    id: "advisor",
    label: "改善提案",
    description: "現在の順位データをもとにASOの改善案をClaudeが自動生成。",
  },
  {
    id: "effect_measure",
    label: "効果測定",
    description: "リリース前後のキーワード順位を比較し、アップデートの効果を計測。",
  },
];

type WorkflowStates = Record<string, boolean>;

export function WorkflowTrigger({
  appId,
  initialActive,
  initialWorkflowStates,
}: {
  appId: string;
  initialActive: boolean;
  initialWorkflowStates: WorkflowStates;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [workflowStates, setWorkflowStates] = useState<WorkflowStates>(initialWorkflowStates);
  const [toggling, setToggling] = useState<string | null>(null); // null or id

  async function toggleApp() {
    if (toggling) return;
    const next = !active;
    setToggling("__app__");
    setActive(next);
    const res = await fetch(`/api/aso/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    if (!res.ok) setActive(!next);
    setToggling(null);
    router.refresh();
  }

  async function toggleWorkflow(id: string) {
    if (toggling) return;
    const next = !workflowStates[id];
    setToggling(id);
    setWorkflowStates((s) => ({ ...s, [id]: next }));
    const res = await fetch(`/api/aso/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowStates: { ...workflowStates, [id]: next } }),
    });
    if (!res.ok) setWorkflowStates((s) => ({ ...s, [id]: !next }));
    setToggling(null);
  }

  const Toggle = ({
    isActive,
    busy,
    onToggle,
  }: {
    isActive: boolean;
    busy: boolean;
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      disabled={busy}
      className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
        isActive ? "bg-[#f0faf4] text-[#1d7a47]" : "bg-[#f5f5f7] text-[#6e6e73]"
      } ${busy ? "opacity-60 cursor-wait" : ""}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isActive ? "bg-emerald-500 animate-pulse" : "bg-[#c7c7cc]"
        }`}
      />
      {isActive ? "稼働中" : "停止中"}
    </button>
  );

  return (
    <div className="divide-y divide-[#f0f0f0]">
      {/* Main app toggle */}
      <div className="flex items-center justify-between py-5 gap-6">
        <div>
          <p className="text-[15px] font-medium text-[#1d1d1f]">ASOエージェント</p>
          <p className="text-[13px] text-[#6e6e73] mt-1 leading-relaxed">
            キーワード順位をスケジュールトラッキングし、改善提案を自動生成。
          </p>
        </div>
        <Toggle
          isActive={active}
          busy={toggling === "__app__"}
          onToggle={toggleApp}
        />
      </div>

      {/* Per-workflow toggles */}
      {WORKFLOWS.map(({ id, label, description }) => (
        <div key={id} className="flex items-center justify-between py-5 gap-6">
          <div>
            <p className="text-[15px] font-medium text-[#1d1d1f]">{label}</p>
            <p className="text-[13px] text-[#6e6e73] mt-1 leading-relaxed">{description}</p>
          </div>
          <Toggle
            isActive={!!workflowStates[id]}
            busy={toggling === id}
            onToggle={() => toggleWorkflow(id)}
          />
        </div>
      ))}
    </div>
  );
}
