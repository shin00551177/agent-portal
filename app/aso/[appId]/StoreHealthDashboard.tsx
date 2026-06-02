import { fetchIosFullListing, fetchAppIconUrl, fetchAscScreenshots } from "@/lib/asc";
import { readListings, fetchGPlayImages } from "@/lib/gplay";

// ─── スコアリング定義 ─────────────────────────────────────────────────────────
// スコア = 文字数使用率 × ウェイト + 業界標準ボーナス
// Good: 80以上 / Warn: 50以上 / Bad: 50未満

type HealthStatus = "good" | "warn" | "bad" | "unknown";

type ElementCard = {
  label: string;
  value: string;
  status: HealthStatus;
  score: number;       // 0〜100
  hint: string;
  best: string;        // ベストプラクティス目標
  maxLen?: number;
};

function utilizationScore(value: string, maxLen: number, warnAt = 50, goodAt = 80): { score: number; status: HealthStatus } {
  if (!value) return { score: 0, status: "bad" };
  const pct = Math.round((value.length / maxLen) * 100);
  const status: HealthStatus = pct >= goodAt ? "good" : pct >= warnAt ? "warn" : "bad";
  return { score: Math.min(pct, 100), status };
}

function boolScore(value: boolean): { score: number; status: HealthStatus } {
  return { score: value ? 100 : 0, status: value ? "good" : "bad" };
}

function ratingScore(rating: number | null): { score: number; status: HealthStatus } {
  if (rating == null) return { score: 0, status: "unknown" };
  const score = Math.round((rating / 5.0) * 100);
  const status: HealthStatus = rating >= 4.3 ? "good" : rating >= 3.5 ? "warn" : "bad";
  return { score, status };
}

function screenshotScore(count: number, maxRecommended: number): { score: number; status: HealthStatus } {
  if (count === 0) return { score: 0, status: "bad" };
  const pct = Math.round((count / maxRecommended) * 100);
  const status: HealthStatus = count >= Math.ceil(maxRecommended * 0.8) ? "good" : count >= 2 ? "warn" : "bad";
  return { score: Math.min(pct, 100), status };
}

// ─── UI components ───────────────────────────────────────────────────────────

function statusColor(s: HealthStatus) {
  if (s === "good")    return "bg-[#f0faf4] text-[#1d7a47] border-[#a8e4bc]";
  if (s === "warn")    return "bg-[#fff8ec] text-[#a05c00] border-[#ffd88a]";
  if (s === "bad")     return "bg-[#fff2f2] text-[#c0392b] border-[#ffb3b3]";
  return "bg-[#f5f5f7] text-[#86868b] border-[#e5e5ea]";
}

function HealthCard({ card }: { card: ElementCard }) {
  const colorCls = statusColor(card.status);
  const truncated = card.value.length > 60 ? card.value.slice(0, 60) + "…" : card.value;
  const barColor = card.status === "good" ? "#34c759" : card.status === "warn" ? "#ff9f0a" : "#ff3b30";

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${colorCls}`}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold">{card.label}</span>
        <span className="text-[12px] font-bold tabular-nums">{card.status === "unknown" ? "—" : `${card.score}pt`}</span>
      </div>

      {/* スコアバー */}
      {card.status !== "unknown" && (
        <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${card.score}%`, background: barColor }}
          />
        </div>
      )}

      <p className="text-[12px] leading-relaxed min-h-[28px]">
        {card.value ? truncated : <span className="italic opacity-60">未設定</span>}
      </p>

      <div className="flex items-center justify-between mt-auto pt-1 border-t border-black/5">
        <span className="text-[10px] opacity-60">{card.hint}</span>
        {card.maxLen && card.value ? (
          <span className="text-[10px] font-mono opacity-60">{card.value.length}/{card.maxLen}</span>
        ) : null}
      </div>
      <div className="text-[10px] opacity-50">目標: {card.best}</div>
    </div>
  );
}

// ─── Overall score ────────────────────────────────────────────────────────────

function OverallScore({ cards }: { cards: ElementCard[] }) {
  const known = cards.filter((c) => c.status !== "unknown");
  const avg = known.length > 0
    ? Math.round(known.reduce((sum, c) => sum + c.score, 0) / known.length)
    : 0;
  const color = avg >= 80 ? "#34c759" : avg >= 50 ? "#ff9f0a" : "#ff3b30";
  const circumference = 2 * Math.PI * 22;
  const offset = circumference * (1 - avg / 100);

  const goodCount = known.filter((c) => c.score >= 80).length;
  const warnCount = known.filter((c) => c.score >= 50 && c.score < 80).length;
  const badCount  = known.filter((c) => c.score < 50).length;

  return (
    <div className="flex items-center gap-6">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="22" fill="none" stroke="#e5e5ea" strokeWidth="6" />
        <circle
          cx="30" cy="30" r="22" fill="none"
          stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 30 30)"
        />
        <text x="30" y="35" textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>{avg}</text>
      </svg>
      <div className="space-y-1">
        <p className="text-[22px] font-semibold text-[#1d1d1f] leading-tight">Store Health Score</p>
        <p className="text-[12px] text-[#6e6e73]">
          文字数使用率・業界標準との差分ベース
        </p>
        <div className="flex gap-3 text-[11px] mt-1">
          <span className="text-[#1d7a47]">● 良好 {goodCount}</span>
          <span className="text-[#a05c00]">● 要改善 {warnCount}</span>
          <span className="text-[#c0392b]">● 未対応 {badCount}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function StoreHealthDashboard({
  appId: _appId,
  iosId,
  googlePlayId,
  ratingsAvg,
  store,
}: {
  appId: string;
  iosId: string | null;
  googlePlayId: string | null;
  ratingsAvg: number | null;
  store?: "ios" | "android";
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

  const iosShotCount  = iosShots?.screenshots.length ?? 0;
  const andShotCount  = andImages?.screenshots.length ?? 0;
  const andHasFeature = !!(andImages?.featureGraphic);

  // ─── iOS カード ──────────────────────────────────────────────────────────
  const iosCards: ElementCard[] = ios ? (() => {
    const titleS    = utilizationScore(ios.title,            30, 60, 80);
    const subtitleS = utilizationScore(ios.subtitle,         30, 50, 80);
    const kwS       = utilizationScore(ios.keywords,        100, 70, 90);
    const descS     = utilizationScore(ios.description,    4000, 20, 50);
    const promoS    = boolScore(!!ios.promotionalText);
    const whatsNewS = boolScore(!!ios.whatsNew);
    return [
      { label: "アプリ名（iOS）",       value: ios.title,            ...titleS,    hint: "検索順位に最も影響", best: "30文字フル活用・主要KW含む", maxLen: 30 },
      { label: "サブタイトル",           value: ios.subtitle,         ...subtitleS, hint: "補完KWを入れる場所",  best: "30文字フル活用",              maxLen: 30 },
      { label: "キーワードフィールド",   value: ios.keywords,         ...kwS,       hint: "非表示・カンマ区切り", best: "100文字フル活用・重複なし",   maxLen: 100 },
      { label: "説明文（iOS）",          value: ios.description,      ...descS,     hint: "冒頭3行が最重要",     best: "冒頭に強いCTA・KW密度高く",   maxLen: 4000 },
      { label: "プロモーションテキスト", value: ios.promotionalText,  ...promoS,    hint: "バージョン不要で変更可", best: "キャンペーン・強み訴求",    maxLen: 170 },
      { label: "What's New（iOS）",      value: ios.whatsNew,         ...whatsNewS, hint: "リリースノート",       best: "KW含む・ユーザー目線",        maxLen: 4000 },
    ];
  })() : [];

  // ─── Android カード ──────────────────────────────────────────────────────
  const androidCards: ElementCard[] = android ? (() => {
    const titleS = utilizationScore(android.title,            50, 50, 80);
    const shortS = utilizationScore(android.shortDescription, 80, 60, 90);
    const descS  = utilizationScore(android.fullDescription, 4000, 20, 50);
    return [
      { label: "アプリ名（Android）", value: android.title,            ...titleS, hint: "Google Playタイトル",     best: "50文字・主要KW含む",          maxLen: 50 },
      { label: "ショート説明文",       value: android.shortDescription, ...shortS, hint: "ストアカードに表示",      best: "80文字フル活用・CTA含む",     maxLen: 80 },
      { label: "説明文（Android）",    value: android.fullDescription,  ...descS,  hint: "詳細説明・KW密度重要",   best: "冒頭に強い訴求文・KW自然含有", maxLen: 4000 },
    ];
  })() : [];

  // ─── ビジュアル・評価 カード ─────────────────────────────────────────────
  const iosShotS  = iosId      ? screenshotScore(iosShotCount, 10) : { score: 0, status: "unknown" as HealthStatus };
  const andShotS  = googlePlayId ? screenshotScore(andShotCount, 8) : { score: 0, status: "unknown" as HealthStatus };
  const featureS  = googlePlayId ? boolScore(andHasFeature) : { score: 0, status: "unknown" as HealthStatus };
  const ratingS   = ratingScore(ratingsAvg);

  const visualCards: ElementCard[] = [
    { label: "スクリーンショット（iOS）",     value: iosShotCount > 0 ? `${iosShotCount}枚` : "",   ...iosShotS,  hint: "最大10枚推奨",       best: "10枚・縦横混在・キャプション付き" },
    { label: "スクリーンショット（Android）", value: andShotCount > 0 ? `${andShotCount}枚` : "",   ...andShotS,  hint: "最大8枚",             best: "8枚・フィーチャーグラフィック必須" },
    { label: "フィーチャーグラフィック",      value: andHasFeature ? "設定済み" : "",                ...featureS,  hint: "Android必須 1024×500", best: "設定必須・訴求コピー入れる" },
    { label: "評価スコア",                    value: ratingsAvg != null ? `★ ${ratingsAvg.toFixed(1)}` : "", ...ratingS, hint: "業界平均 ★4.3",  best: "★4.5以上（ストア検索優遇）" },
  ];

  // storeフィルタ: "ios"→iOSのみ、"android"→Androidのみ、undefined→全部
  const showIos     = !store || store === "ios";
  const showAndroid = !store || store === "android";

  const filteredIosCards     = showIos     ? iosCards     : [];
  const filteredAndroidCards = showAndroid ? androidCards : [];

  // ビジュアルカードもフィルタ
  const filteredVisual = visualCards.filter(c => {
    if (c.label.includes("iOS"))     return showIos;
    if (c.label.includes("Android") || c.label.includes("フィーチャー")) return showAndroid;
    return true; // 評価スコアは常時
  });

  const allCards = [...filteredIosCards, ...filteredAndroidCards, ...filteredVisual];

  return (
    <div className="space-y-6">
      <OverallScore cards={allCards} />

      {showIos && iconUrl && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconUrl} alt="App Icon" className="w-12 h-12 rounded-xl border border-[#f0f0f0] shadow-sm" />
          <div>
            <p className="text-[13px] font-medium text-[#1d1d1f]">アプリアイコン</p>
            <p className="text-[11px] text-[#86868b]">取得済み</p>
          </div>
        </div>
      )}

      {filteredIosCards.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-[#1d1d1f] inline-flex items-center justify-center text-white text-[8px] font-bold">A</span>
            App Store
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredIosCards.map((c) => <HealthCard key={c.label} card={c} />)}
          </div>
        </div>
      )}

      {filteredAndroidCards.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="#34a853"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24A11.37 11.37 0 0012 8a11.37 11.37 0 00-4.47.91L5.65 5.67a.634.634 0 00-.86-.2c-.29.16-.39.54-.22.83L6.4 9.48A10.78 10.78 0 001 19h22a10.78 10.78 0 00-5.4-9.52z"/></svg>
            Google Play
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredAndroidCards.map((c) => <HealthCard key={c.label} card={c} />)}
          </div>
        </div>
      )}

      {filteredVisual.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-3">ビジュアル・評価</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {filteredVisual.map((c) => <HealthCard key={c.label} card={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}
