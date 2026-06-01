"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/Button";

type Review = {
  id: string;
  platform: string;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  reviewDate: string;
  territory: string;
  language: string;
  replyText: string | null;
  replyDate: string | null;
  aiReplySuggestion: string | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M6 1l1.4 2.9 3.1.4-2.3 2.2.5 3.1L6 8.2 3.3 9.6l.5-3.1L1.5 4.3l3.1-.4z"
            fill={i < rating ? "#ff9500" : "#e0e0e0"}
          />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  appId,
  onUpdate,
}: {
  review: Review;
  appId: string;
  onUpdate: (id: string, updates: Partial<Review>) => void;
}) {
  const [suggesting, setSuggesting] = useState(false);
  const [replying, startReply] = useTransition();
  const [replyText, setReplyText] = useState(review.aiReplySuggestion ?? "");
  const [showReplyBox, setShowReplyBox] = useState(false);

  const ratingColor = review.rating <= 2 ? "border-l-[#ff3b30]" : review.rating >= 4 ? "border-l-[#34c759]" : "border-l-[#ff9f0a]";

  async function suggestReply() {
    setSuggesting(true);
    const res = await fetch(`/api/aso/${appId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId: review.id, action: "suggest" }),
    });
    if (res.ok) {
      const { suggestion } = await res.json() as { suggestion: string };
      setReplyText(suggestion);
      onUpdate(review.id, { aiReplySuggestion: suggestion });
      setShowReplyBox(true);
    }
    setSuggesting(false);
  }

  async function sendReply() {
    startReply(async () => {
      const res = await fetch(`/api/aso/${appId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id, action: "reply", replyText }),
      });
      if (res.ok) {
        onUpdate(review.id, { replyText, replyDate: new Date().toISOString() });
        setShowReplyBox(false);
      }
    });
  }

  return (
    <div className={`border border-[#e5e5ea] border-l-4 ${ratingColor} rounded-2xl p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Stars rating={review.rating} />
          <span className="text-[11px] text-[#86868b]">{review.authorName || "匿名"}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-[#f5f5f7] rounded-full text-[#86868b]">
            {review.platform === "ios" ? "iOS" : "Android"}
          </span>
        </div>
        <span className="text-[11px] text-[#86868b] shrink-0">
          {review.reviewDate ? new Date(review.reviewDate).toLocaleDateString("ja-JP") : ""}
        </span>
      </div>

      {/* Content */}
      {review.title && <p className="text-[13px] font-semibold text-[#1d1d1f]">{review.title}</p>}
      <p className="text-[13px] text-[#6e6e73] leading-relaxed">{review.body}</p>

      {/* Existing reply */}
      {review.replyText && (
        <div className="bg-[#f0faf4] rounded-xl px-3 py-2">
          <p className="text-[10px] font-semibold text-[#1d7a47] uppercase tracking-wide mb-1">返信済み</p>
          <p className="text-[12px] text-[#1d1d1f] leading-relaxed">{review.replyText}</p>
        </div>
      )}

      {/* Reply box */}
      {showReplyBox && (
        <div className="space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-[#f5f5f7] rounded-xl text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#079147] resize-none"
            placeholder="返信内容..."
          />
          <p className="text-[10px] text-[#86868b]">{replyText.length}文字</p>
          <div className="flex gap-2">
            <Button onClick={sendReply} disabled={replying || !replyText.trim()}>
              {replying ? "送信中..." : "返信を送信"}
            </Button>
            <button
              onClick={() => setShowReplyBox(false)}
              className="px-3 py-1.5 text-[13px] text-[#86868b] hover:text-[#1d1d1f]"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!review.replyText && !showReplyBox && (
        <div className="flex gap-2">
          <button
            onClick={suggestReply}
            disabled={suggesting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-lg text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors disabled:opacity-50"
          >
            {suggesting ? "生成中..." : "✨ AI返信案を生成"}
          </button>
          <button
            onClick={() => setShowReplyBox(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-lg text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
          >
            ✏️ 手動で返信
          </button>
        </div>
      )}
    </div>
  );
}

export function ReviewsSection({ appId }: { appId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<"all" | "1" | "2" | "3" | "4" | "5">("all");
  const [platform, setPlatform] = useState<"all" | "ios" | "android">("all");

  async function fetchReviews(refresh = false) {
    setLoading(true);
    const params = new URLSearchParams({ platform });
    if (filter !== "all") params.set("rating", filter);
    if (refresh) params.set("refresh", "1");
    const res = await fetch(`/api/aso/${appId}/reviews?${params}`);
    if (res.ok) {
      const data = await res.json() as { reviews: Review[] };
      setReviews(data.reviews);
      setLoaded(true);
    }
    setLoading(false);
  }

  function updateReview(id: string, updates: Partial<Review>) {
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, ...updates } : r));
  }

  const filtered = reviews.filter((r) => {
    if (platform !== "all" && r.platform !== platform) return false;
    if (filter !== "all" && r.rating !== parseInt(filter)) return false;
    return true;
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const lowRating = reviews.filter((r) => r.rating <= 2).length;
  const noReply = reviews.filter((r) => !r.replyText).length;

  return (
    <div className="space-y-6">
      {!loaded ? (
        <div className="text-center py-12">
          <p className="text-[14px] text-[#6e6e73] mb-4">レビューを読み込みます</p>
          <Button onClick={() => fetchReviews(true)} disabled={loading}>
            {loading ? "読み込み中..." : "レビューを取得"}
          </Button>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-6 p-4 bg-[#f5f5f7] rounded-2xl">
            <div className="text-center">
              <p className="text-[28px] font-semibold text-[#1d1d1f] leading-none">★{avgRating ?? "—"}</p>
              <p className="text-[11px] text-[#86868b] mt-1">平均評価</p>
            </div>
            <div className="text-center">
              <p className="text-[28px] font-semibold text-[#c0392b] leading-none">{lowRating}</p>
              <p className="text-[11px] text-[#86868b] mt-1">低評価（★1-2）</p>
            </div>
            <div className="text-center">
              <p className="text-[28px] font-semibold text-[#ff9f0a] leading-none">{noReply}</p>
              <p className="text-[11px] text-[#86868b] mt-1">未返信</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => fetchReviews(true)}
                disabled={loading}
                className="px-4 py-2 bg-white border border-[#e5e5ea] rounded-xl text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] hover:border-[#c7c7cc] transition-colors disabled:opacity-50"
              >
                {loading ? "更新中..." : "🔄 更新"}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-[#f5f5f7] rounded-xl">
              {(["all", "ios", "android"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-colors ${
                    platform === p ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b] hover:text-[#1d1d1f]"
                  }`}
                >
                  {p === "all" ? "全て" : p === "ios" ? "iOS" : "Android"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#f5f5f7] rounded-xl">
              {(["all", "1", "2", "3", "4", "5"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${
                    filter === r ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b] hover:text-[#1d1d1f]"
                  }`}
                >
                  {r === "all" ? "全評価" : `★${r}`}
                </button>
              ))}
            </div>
          </div>

          {/* Review list */}
          {filtered.length === 0 ? (
            <p className="text-center text-[13px] text-[#86868b] py-8">該当するレビューはありません</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <ReviewCard key={r.id} review={r} appId={appId} onUpdate={updateReview} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
