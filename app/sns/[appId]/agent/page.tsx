"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "TikTok向けにバズりそうなフックを5個考えて",
  "Twomiの恋愛相談コンテンツの台本を作って",
  "今月の投稿スケジュールを週3本で組んで",
  "蓄積されたパターンの中で一番使えるものはどれ？",
];

export default function AgentPage() {
  const { appId } = useParams<{ appId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setLoading(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    const res = await fetch(`/api/sns/${appId}/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages }),
    });

    if (!res.ok || !res.body) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "エラーが発生しました" },
      ]);
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: full },
      ]);
    }

    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px] max-w-3xl">
      <div className="mb-4">
        <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">AIコンテンツアシスタント</h2>
        <p className="text-[13px] text-[#6e6e73] mt-1">
          成功パターン・参考動画・エゴサ結果を参照しながらコンテンツ制作を支援します
        </p>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="space-y-3 pt-4">
            <p className="text-[13px] text-[#86868b]">よく使う質問</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full text-left px-4 py-3 rounded-xl bg-[#f5f5f7] text-[13px] text-[#1d1d1f] hover:bg-[#ebebeb] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-[#0071e3] text-white"
                  : "bg-[#f5f5f7] text-[#1d1d1f]"
              }`}
            >
              {m.content}
              {m.role === "assistant" && loading && i === messages.length - 1 && m.content === "" && (
                <span className="inline-block w-2 h-4 bg-[#86868b] animate-pulse rounded" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="pt-4 border-t border-[#f0f0f0] flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Shift+Enterで改行 / Enterで送信"
          rows={2}
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-xl border border-[#d2d2d7] text-[14px] resize-none focus:outline-none focus:border-[#0071e3] transition-colors"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="px-5 py-3 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] disabled:opacity-40 transition-colors flex-shrink-0"
        >
          送信
        </button>
      </div>
    </div>
  );
}
