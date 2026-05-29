"use client";

import { useState, useRef, useEffect } from "react";

// ─── Cat SVG ────────────────────────────────────────────────────────────────

function CatFace({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="55" r="38" fill="#FF9F43"/>
      <polygon points="18,28 8,4 36,22" fill="#FF9F43"/>
      <polygon points="82,28 92,4 64,22" fill="#FF9F43"/>
      <polygon points="20,26 13,10 32,23" fill="#FFD0A0"/>
      <polygon points="80,26 87,10 68,23" fill="#FFD0A0"/>
      <ellipse cx="36" cy="52" rx="7" ry="8" fill="#1d1d1f"/>
      <ellipse cx="64" cy="52" rx="7" ry="8" fill="#1d1d1f"/>
      <circle cx="38" cy="50" r="2.5" fill="white"/>
      <circle cx="66" cy="50" r="2.5" fill="white"/>
      <ellipse cx="50" cy="63" rx="4" ry="3" fill="#FF6B6B"/>
      <path d="M 44 67 Q 50 72 56 67" stroke="#c0392b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <line x1="10" y1="61" x2="40" y2="63" stroke="#1d1d1f" strokeWidth="1" opacity="0.4"/>
      <line x1="10" y1="67" x2="40" y2="66" stroke="#1d1d1f" strokeWidth="1" opacity="0.4"/>
      <line x1="90" y1="61" x2="60" y2="63" stroke="#1d1d1f" strokeWidth="1" opacity="0.4"/>
      <line x1="90" y1="67" x2="60" y2="66" stroke="#1d1d1f" strokeWidth="1" opacity="0.4"/>
    </svg>
  );
}

type Message = { role: "user" | "assistant"; text: string };

const QUICK_QUESTIONS = [
  "App Powerが低い理由は？",
  "今すぐできる改善は？",
  "ねらうべきキーワードは？",
];

export function AsoChatBot({ appId }: { appId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 150);
    }
  }, [open, messages.length]);

  async function send(q: string) {
    const text = q.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/aso/${appId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
        credentials: "include",
      });
      const json = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: json.answer ?? "エラーが発生しましたにゃ🙀" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "通信エラーが発生しましたにゃ🙀" }]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* ── Chat window (slides in from right) ── */}
      <div className={`fixed right-0 bottom-0 top-0 z-50 flex items-end justify-end pointer-events-none`}>
        <div className={`w-[360px] h-full max-h-[560px] mb-0 pointer-events-auto bg-white flex flex-col
          shadow-2xl border-l border-[#e8e8ed] transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
          style={{ marginTop: "auto", borderTopLeftRadius: "20px" }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4"
            style={{ background: "linear-gradient(135deg, #FF9F43 0%, #FF6B6B 100%)" }}>
            <CatFace size={36} />
            <div className="flex-1">
              <p className="text-[15px] font-bold text-white leading-tight">ASO にゃんこ</p>
              <p className="text-[11px] text-white/80">データについて何でも聞いてにゃ</p>
            </div>
            <button onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white text-[16px] font-medium">
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#fafafa]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center pt-6 space-y-4">
                <CatFace size={64} />
                <p className="text-[13px] text-[#6e6e73] text-center leading-relaxed px-4">
                  ASOデータについて<br/>気軽に質問してにゃ🐾
                </p>
                <div className="w-full space-y-2">
                  {QUICK_QUESTIONS.map((q) => (
                    <button key={q} onClick={() => send(q)}
                      className="w-full text-left text-[12px] px-4 py-2.5 bg-white border border-[#e8e8ed] rounded-2xl text-[#1d1d1f] hover:border-[#FF9F43] hover:bg-[#fff7f0] transition-all shadow-sm">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                  {m.role === "assistant" && (
                    <div className="shrink-0 mt-1"><CatFace size={26} /></div>
                  )}
                  <div className={`max-w-[240px] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#FF9F43] text-white rounded-br-sm"
                      : "bg-white border border-[#e8e8ed] text-[#1d1d1f] rounded-bl-sm shadow-sm"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-center gap-2">
                <CatFace size={26} />
                <div className="bg-white border border-[#e8e8ed] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    {[0,1,2].map((i) => (
                      <span key={i} className="w-2 h-2 bg-[#FF9F43] rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 bg-white border-t border-[#f0f0f0] flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="質問を入力…"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#f5f5f7] rounded-full text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#FF9F43]/50 disabled:opacity-50"
            />
            <button onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-[#FF9F43] hover:bg-[#f09000] disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors shrink-0 shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Side tab trigger ── */}
      {!open && (
        <div className="fixed right-0 bottom-32 z-50 flex flex-col items-end">
          {/* Label tab */}
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-0 group"
            aria-label="ASO チャット">
            <div className="py-3 px-3 rounded-l-2xl shadow-lg text-white text-[11px] font-bold leading-tight text-center cursor-pointer
              group-hover:pl-4 transition-all duration-200"
              style={{ background: "linear-gradient(180deg, #FF9F43 0%, #FF6B6B 100%)", writingMode: "vertical-rl" }}>
              ASO質問
            </div>
            {/* Cat icon circle */}
            <div className="absolute -bottom-14 right-0 w-14 h-14 rounded-full shadow-xl border-2 border-white
              flex items-center justify-center bg-white"
              style={{ background: "linear-gradient(135deg, #fff7f0, #fff)" }}>
              <CatFace size={38} />
            </div>
          </button>
        </div>
      )}

      {/* Notification dot */}
      {!open && messages.length > 0 && (
        <div className="fixed right-0 bottom-32 z-50 pointer-events-none">
          <span className="absolute top-0 right-0 w-3 h-3 bg-[#ff3b30] rounded-full border-2 border-white" />
        </div>
      )}
    </>
  );
}
