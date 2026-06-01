"use client";

import { useState } from "react";

export function AccountSwitchModal({ onLogout }: { onLogout: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ロゴボタン */}
      <button
        onClick={() => setOpen(true)}
        className="text-[15px] font-semibold tracking-tight flex items-center gap-2"
        style={{ color: "#fff" }}
      >
        <span style={{ color: "#079147", fontWeight: 700 }}>●</span>
        Agent Portal
      </button>

      {/* モーダル */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="text-[32px]">🔄</div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">アカウントを切り替えますか？</h2>
              <p className="text-[13px] text-[#6e6e73]">
                ログイン画面に戻ってアカウントを選択し直せます
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium hover:bg-[#ebebeb] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-2.5 rounded-xl bg-[#1d1d1f] text-white text-[14px] font-medium hover:bg-black transition-colors"
              >
                ログイン画面へ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
