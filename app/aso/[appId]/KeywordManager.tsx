"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/Button";

type Keyword = { id: string; keyword: string; priority: string };

export function KeywordManager({ appId, keywords }: { appId: string; keywords: Keyword[] }) {
  const [list, setList] = useState(keywords);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<"high" | "medium">("medium");
  const [isPending, startTransition] = useTransition();

  async function addKeyword() {
    const kw = input.trim();
    if (!kw) return;
    const res = await fetch(`/api/aso/${appId}/keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: kw, priority }),
    });
    if (res.ok) {
      const created = await res.json();
      setList((prev) => [...prev, created]);
      setInput("");
    }
  }

  async function deleteKeyword(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/aso/${appId}/keywords/${id}`, { method: "DELETE" });
      if (res.ok) setList((prev) => prev.filter((k) => k.id !== id));
    });
  }

  const high   = list.filter((k) => k.priority === "high");
  const medium = list.filter((k) => k.priority !== "high");

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addKeyword()}
          placeholder="例: AI アバター 無料"
          className="flex-1 px-3 py-2 bg-[#f5f5f7] rounded-lg text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as "high" | "medium")}
          className="px-3 py-2 bg-[#f5f5f7] rounded-lg text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
        >
          <option value="high">優先度: 高</option>
          <option value="medium">優先度: 中</option>
        </select>
        <Button onClick={addKeyword}>追加</Button>
      </div>

      {[
        { label: "優先度 高", items: high,   key: "high" },
        { label: "優先度 中", items: medium, key: "medium" },
      ].map(({ label, items, key }) =>
        items.length === 0 ? null : (
          <div key={key}>
            <p className="text-[11px] text-[#6e6e73] uppercase tracking-wider mb-3">{label}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((kw) => (
                <span
                  key={kw.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f5f7] rounded-full text-[13px] font-medium text-[#1d1d1f]"
                >
                  {kw.keyword}
                  <button
                    onClick={() => deleteKeyword(kw.id)}
                    disabled={isPending}
                    className="text-[#86868b] hover:text-[#1d1d1f] transition-colors leading-none text-[11px]"
                    title="削除"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )
      )}

      {list.length === 0 && (
        <p className="text-[#6e6e73] text-[13px] py-8 text-center border border-dashed border-[#d2d2d7] rounded-xl">
          キーワードがまだありません
        </p>
      )}
    </div>
  );
}
