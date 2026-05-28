"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

type Account = {
  id: string;
  platform: string;
  username: string;
  url: string | null;
  memo: string | null;
};

const PLATFORMS = ["YouTube", "Instagram", "X", "TikTok", "Facebook", "Threads"];

const inputClass = "w-full px-3 py-2 bg-[#f5f5f7] rounded-lg text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]";

export function AccountManager({
  appId,
  initialAccounts,
  appName,
}: {
  appId: string;
  initialAccounts: Account[];
  appName: string;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: "YouTube", username: "", url: "", memo: "" });
  const [saving, setSaving] = useState(false);

  async function addAccount() {
    if (!form.username.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/sns/${appId}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = await res.json();
      setAccounts((prev) => [...prev, created]);
      setForm({ platform: "YouTube", username: "", url: "", memo: "" });
      setShowForm(false);
    }
    setSaving(false);
  }

  async function deleteAccount(id: string) {
    const res = await fetch(`/api/sns/${appId}/accounts/${id}`, { method: "DELETE" });
    if (res.ok) setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((v) => !v)}>+ アカウント追加</Button>
      </div>

      {showForm && (
        <div className="border border-[#f0f0f0] rounded-2xl p-5 space-y-4">
          <p className="text-[14px] font-semibold text-[#1d1d1f]">新規アカウント</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-[#6e6e73] mb-1.5">プラットフォーム</label>
              <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                className={inputClass}>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#6e6e73] mb-1.5">アカウント名</label>
              <input type="text" placeholder="@handle" value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] text-[#6e6e73] mb-1.5">URL（任意）</label>
              <input type="url" placeholder="https://..." value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] text-[#6e6e73] mb-1.5">メモ（ジャンル等）</label>
              <input type="text" placeholder="例: 公式、恋愛相談、エンタメ" value={form.memo}
                onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowForm(false)}>キャンセル</Button>
            <Button onClick={addAccount} disabled={saving || !form.username.trim()}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      )}

      <div className="divide-y divide-[#f0f0f0]">
        {accounts.length === 0 ? (
          <p className="text-[#6e6e73] text-[13px] py-8 text-center">
            アカウントがまだ登録されていません
          </p>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-5">
                <div className="w-8 h-8 rounded-lg bg-[#f5f5f7] flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-[#1d1d1f]">{account.platform[0]}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-medium text-[#1d1d1f]">{account.username}</span>
                    {account.url && (
                      <a href={account.url} target="_blank" rel="noopener noreferrer"
                        className="text-[#0071e3] text-[13px] hover:underline">↗</a>
                    )}
                  </div>
                  <p className="text-[12px] text-[#6e6e73]">
                    {account.platform} · {appName}
                    {account.memo ? ` · ${account.memo}` : ""}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="danger" onClick={() => deleteAccount(account.id)}>削除</Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
