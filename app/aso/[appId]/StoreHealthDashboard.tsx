import { fetchIosFullListing, fetchAppIconUrl, fetchAscScreenshots } from "@/lib/asc";
import { readListings, fetchGPlayImages } from "@/lib/gplay";

type HealthStatus = "good" | "warn" | "bad" | "unknown";

function statusColor(s: HealthStatus) {
  if (s === "good")    return "bg-[#f0faf4] text-[#1d7a47] border-[#a8e4bc]";
  if (s === "warn")    return "bg-[#fff8ec] text-[#a05c00] border-[#ffd88a]";
  if (s === "bad")     return "bg-[#fff2f2] text-[#c0392b] border-[#ffb3b3]";
  return "bg-[#f5f5f7] text-[#86868b] border-[#e5e5ea]";
}

function statusDot(s: HealthStatus) {
  if (s === "good")    return "bg-[#34c759]";
  if (s === "warn")    return "bg-[#ff9f0a]";
  if (s === "bad")     return "bg-[#ff3b30]";
  return "bg-[#c7c7cc]";
}

function statusLabel(s: HealthStatus) {
  if (s === "good")    return "良好";
  if (s === "warn")    return "要改善";
  if (s === "bad")     return "未設定";
  return "—";
}

function textStatus(value: string, minGood: number, minWarn = 1): HealthStatus {
  if (!value) return "bad";
  if (value.length >= minGood) return "good";
  if (value.length >= minWarn) return "warn";
  return "bad";
}

function screenshotStatus(count: number): HealthStatus {
  if (count >= 4) return "good";
  if (count >= 1) return "warn";
  return "bad";
}

function ratingStatus(rating: number | null): HealthStatus {
  if (rating == null) return "unknown";
  if (rating >= 4.0) return "good";
  if (rating >= 3.0) return "warn";
  return "bad";
}

type ElementCard = {
  label: string;
  value: string;
  status: HealthStatus;
  hint: string;
  maxLen?: number;
};

function HealthCard({ card }: { card: ElementCard }) {
  const colorCls = statusColor(card.status);
  const dotCls   = statusDot(card.status);
  const truncated = card.value.length > 60 ? card.value.slice(0, 60) + "…" : card.value;

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-2 ${colorCls}`}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold">{card.label}</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${dotCls}`} />
          <span className="text-[11px] font-medium">{statusLabel(card.status)}</span>
        </div>
      </div>
      <p className="text-[12px] leading-relaxed min-h-[32px]">
        {card.value ? truncated : <span className="italic opacity-60">未設定</span>}
      </p>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-[10px] opacity-60">{card.hint}</span>
        {card.maxLen && card.value && (
          <span className="text-[10px] font-mono opacity-60">{card.value.length}/{card.maxLen}</span>
        )}
      </div>
    </div>
  );
}

// ─── Overall score ────────────────────────────────────────────────────────────

function OverallScore({ cards }: { cards: ElementCard[] }) {
  const known = cards.filter((c) => c.status !== "unknown");
  const good  = known.filter((c) => c.status === "good").length;
  const score = known.length > 0 ? Math.round((good / known.length) * 100) : 0;
  const color = score >= 80 ? "#34c759" : score >= 50 ? "#ff9f0a" : "#ff3b30";
  const circumference = 2 * Math.PI * 20;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="flex items-center gap-4">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="20" fill="none" stroke="#e5e5ea" strokeWidth="5" />
        <circle
          cx="28" cy="28" r="20" fill="none"
          stroke={color} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 28 28)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x="28" y="33" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <div>
        <p className="text-[22px] font-semibold text-[#1d1d1f] leading-tight">Store Health Score</p>
        <p className="text-[13px] text-[#6e6e73] mt-0.5">
          {good} / {known.length} 項目が最適化済み
        </p>
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function StoreHealthDashboard({
  appId,
  iosId,
  googlePlayId,
  ratingsAvg,
}: {
  appId: string;
  iosId: string | null;
  googlePlayId: string | null;
  ratingsAvg: number | null;
}) {
  const [iosListing, androidListings, iosScreenshots, androidImages, iosIconUrl] = await Promise.allSettled([
    iosId ? fetchIosFullListing(iosId) : Promise.resolve(null),
    googlePlayId ? readListings(googlePlayId) : Promise.resolve([]),
    iosId ? fetchAscScreenshots(iosId, "ja") : Promise.resolve(null),
    googlePlayId ? fetchGPlayImages(googlePlayId, "ja-JP") : Promise.resolve(null),
    iosId ? fetchAppIconUrl(iosId) : Promise.resolve(null),
  ]);

  const ios     = iosListing.status === "fulfilled" ? iosListing.value : null;
  const android = androidListings.status === "fulfilled"
    ? ((androidListings.value ?? []).find((l) => l.language === "ja-JP") ?? (androidListings.value ?? [])[0] ?? null)
    : null;
  const iosShots  = iosScreenshots.status === "fulfilled" ? iosScreenshots.value : null;
  const andImages = androidImages.status === "fulfilled" ? androidImages.value : null;
  const iconUrl   = iosIconUrl.status === "fulfilled" ? iosIconUrl.value : null;

  const iosShotCount = iosShots?.screenshots.length ?? 0;
  const andShotCount = andImages?.screenshots.length ?? 0;
  const andHasFeatureGraphic = !!(andImages?.featureGraphic);

  // ─── iOS cards ────────────────────────────────────────────────────────────
  const iosCards: ElementCard[] = ios ? [
    {
      label: "アプリ名（iOS）",
      value: ios.title,
      status: textStatus(ios.title, 10, 2),
      hint: "検索順位に最も影響する要素",
      maxLen: 30,
    },
    {
      label: "サブタイトル",
      value: ios.subtitle,
      status: textStatus(ios.subtitle, 20, 5),
      hint: "キーワードを追加で入れる場所",
      maxLen: 30,
    },
    {
      label: "キーワードフィールド",
      value: ios.keywords,
      status: textStatus(ios.keywords, 80, 20),
      hint: "非表示・カンマ区切り",
      maxLen: 100,
    },
    {
      label: "説明文（iOS）",
      value: ios.description,
      status: textStatus(ios.description, 500, 100),
      hint: "ユーザーへの訴求文",
      maxLen: 4000,
    },
    {
      label: "プロモーションテキスト",
      value: ios.promotionalText,
      status: ios.promotionalText ? "good" : "warn",
      hint: "バージョン不要でいつでも変更可",
      maxLen: 170,
    },
    {
      label: "What's New（iOS）",
      value: ios.whatsNew,
      status: ios.whatsNew ? "good" : "warn",
      hint: "リリースノート",
      maxLen: 4000,
    },
  ] : [];

  // ─── Android cards ────────────────────────────────────────────────────────
  const androidCards: ElementCard[] = android ? [
    {
      label: "アプリ名（Android）",
      value: android.title,
      status: textStatus(android.title, 10, 2),
      hint: "Google Play タイトル",
      maxLen: 50,
    },
    {
      label: "ショート説明文",
      value: android.shortDescription,
      status: textStatus(android.shortDescription, 50, 10),
      hint: "ストアカードに表示",
      maxLen: 80,
    },
    {
      label: "説明文（Android）",
      value: android.fullDescription,
      status: textStatus(android.fullDescription, 500, 100),
      hint: "詳細説明",
      maxLen: 4000,
    },
  ] : [];

  // ─── Visual cards ─────────────────────────────────────────────────────────
  const visualCards: ElementCard[] = [
    {
      label: "スクリーンショット（iOS）",
      value: iosShotCount > 0 ? `${iosShotCount}枚設定済み` : "",
      status: iosId ? screenshotStatus(iosShotCount) : "unknown",
      hint: "最大10枚推奨",
    },
    {
      label: "スクリーンショット（Android）",
      value: andShotCount > 0 ? `${andShotCount}枚設定済み` : "",
      status: googlePlayId ? screenshotStatus(andShotCount) : "unknown",
      hint: "最大8枚",
    },
    {
      label: "フィーチャーグラフィック",
      value: andHasFeatureGraphic ? "設定済み" : "",
      status: googlePlayId ? (andHasFeatureGraphic ? "good" : "bad") : "unknown",
      hint: "Android必須 1024×500px",
    },
    {
      label: "App Preview動画（iOS）",
      value: "",
      status: "unknown",
      hint: "スクリーンショットより高CVR",
    },
    {
      label: "評価スコア",
      value: ratingsAvg != null ? `★ ${ratingsAvg.toFixed(1)}` : "",
      status: ratingStatus(ratingsAvg),
      hint: "検索順位に影響",
    },
  ];

  const allCards = [...iosCards, ...androidCards, ...visualCards];

  return (
    <div className="space-y-6">
      {/* Overall score */}
      <OverallScore cards={allCards} />

      {/* App icon */}
      {iconUrl && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconUrl} alt="App Icon" className="w-12 h-12 rounded-xl border border-[#f0f0f0] shadow-sm" />
          <div>
            <p className="text-[13px] font-medium text-[#1d1d1f]">アプリアイコン</p>
            <p className="text-[11px] text-[#86868b]">取得済み</p>
          </div>
        </div>
      )}

      {/* iOS section */}
      {iosCards.length > 0 && (
        <div>
          <p className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-[#1d1d1f] inline-flex items-center justify-center text-white text-[8px] font-bold">A</span>
            App Store
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {iosCards.map((c) => <HealthCard key={c.label} card={c} />)}
          </div>
        </div>
      )}

      {/* Android section */}
      {androidCards.length > 0 && (
        <div>
          <p className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#34a853"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24A11.37 11.37 0 0012 8a11.37 11.37 0 00-4.47.91L5.65 5.67a.634.634 0 00-.86-.2c-.29.16-.39.54-.22.83L6.4 9.48A10.78 10.78 0 001 19h22a10.78 10.78 0 00-5.4-9.52z"/></svg>
            Google Play
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {androidCards.map((c) => <HealthCard key={c.label} card={c} />)}
          </div>
        </div>
      )}

      {/* Visual section */}
      <div>
        <p className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wide mb-3">
          ビジュアル・その他
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visualCards.map((c) => <HealthCard key={c.label} card={c} />)}
        </div>
      </div>
    </div>
  );
}
