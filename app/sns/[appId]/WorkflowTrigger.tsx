"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WorkflowTrigger({
  appId,
  initialActive,
}: {
  appId: string;
  initialActive: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [toggling, setToggling] = useState(false);

  async function toggleActive() {
    if (toggling) return;
    const next = !active;
    setToggling(true);
    setActive(next);
    const res = await fetch(`/api/sns/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    if (!res.ok) setActive(!next);
    setToggling(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between py-5 gap-6">
      <div>
        <p className="text-[15px] font-medium text-[#1d1d1f]">エゴサエージェント</p>
        <p className="text-[13px] text-[#6e6e73] mt-1 leading-relaxed">
          Google・X・YouTube等でアプリへの言及をスケジュール収集し、Slackに通知。
        </p>
      </div>
      <button
        onClick={toggleActive}
        disabled={toggling}
        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
          active ? "bg-[#f0faf4] text-[#1d7a47]" : "bg-[#f5f5f7] text-[#6e6e73]"
        } ${toggling ? "opacity-60 cursor-wait" : ""}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            active ? "bg-emerald-500 animate-pulse" : "bg-[#c7c7cc]"
          }`}
        />
        {active ? "稼働中" : "停止中"}
      </button>
    </div>
  );
}
