"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Learning = {
  id: string;
  type: string;
  content: string;
  platform: string | null;
  source: string;
  active: boolean;
  createdAt: string;
};

const TYPE_CONFIG = {
  avoid:      { label: "やってはいけない", cls: "bg-red-50 text-red-600 border-red-200",       dot: "bg-red-500" },
  prioritize: { label: "優先すべき",       cls: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
  general:    { label: "一般原則",          cls: "bg-blue-50 text-blue-600 border-blue-200",    dot: "bg-blue-500" },
} as const;

const TYPES = Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[];

export default function LearningsPage() {
  const { appId } = useParams<{ appId: string }>();
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [synthesizing, setSynthesizing] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: "avoid" as keyof typeof TYPE_CONFIG, content: "", platform: "" });

  async function load() {
    const res = await fetch(`/api/sns/${appId}/learnings`);
    if (res.ok) setLearnings(await res.json());
  }
  useEffect(() => { load(); }, [appId]);

  async function synthesize() {
    setSynthesizing(true);
    const res = await fetch(`/api/sns/${appId}/learnings/synthesize`, { method: "POST" });
    setSynthesizing(false);
    if (res.ok) await load();
    else {
      const d = await res.json();
      alert(d.error ?? "合成に失敗しました");
    }
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/sns/${appId}/learnings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    await load();
  }

  async function save(id: string) {
    await fetch(`/api/sns/${appId}/learnings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setEditingId(null);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/sns/${appId}/learnings/${id}`, { method: "DELETE" });
    await load();
  }

  async function addLearning() {
    if (!form.content.trim()) return;
    await fetch(`/api/sns/${appId}/learnings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, platform: form.platform || null }),
    });
    setForm({ type: "avoid", content: "", platform: "" });
    setAdding(false);
    await load();
  }

  const visible = showInactive ? learnings : learnings.filter((l) => l.active);
  const grouped = TYPES.map((type) => ({
    type,
    items: visible.filter((l) => l.type === type),
  }));
  const activeCount = learnings.filter((l) => l.active).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">学習DB</h2>
          <p className="text-[13px] text-[#6e6e73] mt-1">
            仮説生成に注入される原則リスト。{activeCount}件が有効。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${
              showInactive ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#6e6e73]"
            }`}
          >
            {showInactive ? "無効を含む" : "有効のみ"}
          </button>
          <button
            onClick={synthesize}
            disabled={synthesizing}
            className="px-4 py-2 rounded-xl bg-purple-500 text-white text-[13px] font-medium hover:bg-purple-600 disabled:opacity-40 transition-colors"
          >
            {synthesizing ? "合成中..." : "差し戻しから合成"}
          </button>
          <button
            onClick={() => setAdding(!adding)}
            className="px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-[13px] font-medium"
          >
            + 手動追加
          </button>
        </div>
      </div>

      {/* 手動追加フォーム */}
      {adding && (
        <div className="rounded-2xl border border-[#f0f0f0] p-5 space-y-3">
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, type: t })}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-colors ${
                  form.type === t ? TYPE_CONFIG[t].cls : "bg-[#f5f5f7] text-[#6e6e73] border-transparent"
                }`}
              >
                {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="学びの内容（1〜2文で具体的に）"
            rows={3}
            className="w-full px-3 py-2.5 border border-[#d2d2d7] rounded-xl text-[13px] resize-none focus:outline-none focus:border-[#1d1d1f]"
          />
          <div className="flex gap-2">
            <input
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              placeholder="プラットフォーム（空白=全体）"
              className="flex-1 px-3 py-2 border border-[#d2d2d7] rounded-xl text-[12px] focus:outline-none"
            />
            <button
              onClick={addLearning}
              disabled={!form.content.trim()}
              className="px-5 py-2 rounded-xl bg-[#1d1d1f] text-white text-[13px] font-medium disabled:opacity-40"
            >
              追加
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 rounded-xl bg-[#f5f5f7] text-[#6e6e73] text-[13px]"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 学びリスト（タイプ別） */}
      {grouped.map(({ type, items }) => {
        if (items.length === 0) return null;
        const cfg = TYPE_CONFIG[type];
        return (
          <section key={type}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <p className="text-[12px] font-semibold text-[#1d1d1f] uppercase tracking-wide">{cfg.label}</p>
              <span className="text-[11px] text-[#86868b]">{items.length}件</span>
            </div>
            <div className="space-y-2">
              {items.map((l) => (
                <div
                  key={l.id}
                  className={`rounded-2xl border p-4 space-y-2 transition-opacity ${
                    l.active ? "border-[#f0f0f0]" : "border-[#f0f0f0] opacity-40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {editingId === l.id ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="flex-1 px-3 py-2 border border-[#d2d2d7] rounded-xl text-[13px] resize-none focus:outline-none focus:border-[#1d1d1f]"
                      />
                    ) : (
                      <p className="flex-1 text-[13px] text-[#1d1d1f] leading-relaxed">{l.content}</p>
                    )}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {l.platform && (
                        <span className="text-[10px] text-[#86868b] bg-[#f5f5f7] px-2 py-0.5 rounded-full capitalize">
                          {l.platform}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        l.source === "ai_synthesis"
                          ? "bg-purple-50 text-purple-500"
                          : "bg-[#f5f5f7] text-[#86868b]"
                      }`}>
                        {l.source === "ai_synthesis" ? "AI" : "手動"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === l.id ? (
                      <>
                        <button onClick={() => save(l.id)} className="text-[11px] text-[#079147] hover:underline">保存</button>
                        <button onClick={() => setEditingId(null)} className="text-[11px] text-[#86868b] hover:underline">キャンセル</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(l.id); setEditContent(l.content); }}
                          className="text-[11px] text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                        >編集</button>
                        <button
                          onClick={() => toggle(l.id, !l.active)}
                          className="text-[11px] text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                        >
                          {l.active ? "無効化" : "有効化"}
                        </button>
                        <button
                          onClick={() => remove(l.id)}
                          className="text-[11px] text-red-400 hover:text-red-600 transition-colors"
                        >削除</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {visible.length === 0 && (
        <div className="py-16 rounded-2xl border border-dashed border-[#d2d2d7] text-center">
          <p className="text-[14px] text-[#6e6e73]">学びがまだありません</p>
          <p className="text-[12px] text-[#86868b] mt-1">
            差し戻しが蓄積されたら「差し戻しから合成」でAIが原則を抽出します
          </p>
        </div>
      )}
    </div>
  );
}
