import { readListings, fetchPlayWhatsNew } from "@/lib/gplay";
import { fetchIosFullListing } from "@/lib/asc";

type Listing = {
  platform: "ios" | "android";
  language: string;
  title: string;
  subtitle?: string;
  shortDescription?: string;
  description: string;
  promotionalText?: string;
  whatsNew?: string;
  keywords?: string;
};

// iOS メタデータ取得（fetchIosFullListing に委譲）
async function fetchIosListing(iosId: string): Promise<Listing | null> {
  try {
    const full = await fetchIosFullListing(iosId);
    if (!full) return null;
    return {
      platform: "ios",
      language: "ja",
      title: full.title,
      subtitle: full.subtitle,
      description: full.description,
      keywords: full.keywords,
      promotionalText: full.promotionalText,
      whatsNew: full.whatsNew,
    };
  } catch {
    return null;
  }
}

// Android メタデータ取得
async function fetchAndroidListing(packageName: string): Promise<Listing | null> {
  try {
    const [listings, whatsNew] = await Promise.all([
      readListings(packageName),
      fetchPlayWhatsNew(packageName).catch(() => null),
    ]);
    const ja = listings.find((l) => l.language === "ja-JP") ?? listings[0];
    if (!ja) return null;
    return {
      platform: "android",
      language: ja.language,
      title: ja.title,
      shortDescription: ja.shortDescription,
      description: ja.fullDescription,
      whatsNew: whatsNew ?? "",
    };
  } catch {
    return null;
  }
}

// ─── 星評価 ────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M6 1l1.4 2.9 3.1.4-2.3 2.2.5 3.1L6 8.2 3.3 9.6l.5-3.1L1.5 4.3l3.1-.4z"
            fill={i < full ? "#ff9500" : i === full && half ? "#ff9500" : "#e0e0e0"}
          />
        </svg>
      ))}
      <span className="text-[11px] text-[#86868b] ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Store Card ─────────────────────────────────────────────────────────────

function IosCard({ listing }: { listing: Listing }) {
  return (
    <div className="border border-[#f0f0f0] rounded-2xl overflow-hidden bg-white">
      {/* App Store header */}
      <div className="px-4 py-2 bg-[#f5f5f7] border-b border-[#f0f0f0] flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[11px] text-[#86868b] font-medium">App Store</span>
      </div>
      <div className="p-4">
        {/* App icon placeholder + title */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e8e8ed] to-[#d2d2d7] shrink-0 flex items-center justify-center">
            <span className="text-[20px]">📱</span>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#1d1d1f] leading-tight">{listing.title || "—"}</p>
            {listing.subtitle && <p className="text-[12px] text-[#6e6e73] mt-0.5">{listing.subtitle}</p>}
          </div>
        </div>
        {/* Promotional text */}
        {listing.promotionalText && (
          <div className="mb-2 px-2 py-1.5 bg-[#f0f8ff] rounded-lg">
            <p className="text-[10px] text-[#079147] font-semibold uppercase tracking-wide mb-0.5">プロモーションテキスト</p>
            <p className="text-[11px] text-[#1d1d1f] leading-relaxed">{listing.promotionalText}</p>
          </div>
        )}
        {/* Description */}
        {listing.description && (
          <p className="text-[12px] text-[#6e6e73] leading-relaxed line-clamp-3">{listing.description}</p>
        )}
        {/* Keywords */}
        {listing.keywords && (
          <div className="mt-3">
            <p className="text-[10px] text-[#86868b] uppercase tracking-wide mb-1">キーワード</p>
            <div className="flex flex-wrap gap-1">
              {listing.keywords.split(",").slice(0, 8).map((kw) => (
                <span key={kw.trim()} className="text-[10px] px-2 py-0.5 bg-[#f5f5f7] rounded-full text-[#6e6e73]">
                  {kw.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* What's New */}
        {listing.whatsNew && (
          <div className="mt-3 px-2 py-1.5 bg-[#f0faf4] rounded-lg">
            <p className="text-[10px] text-[#1d7a47] font-semibold uppercase tracking-wide mb-0.5">What&apos;s New</p>
            <p className="text-[11px] text-[#1d1d1f] leading-relaxed line-clamp-2">{listing.whatsNew}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AndroidCard({ listing }: { listing: Listing }) {
  return (
    <div className="border border-[#f0f0f0] rounded-2xl overflow-hidden bg-white">
      {/* Google Play header */}
      <div className="px-4 py-2 bg-[#f5f5f7] border-b border-[#f0f0f0] flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M3 20.5v-17l18 8.5-18 8.5z" fill="#4285f4"/>
          <path d="M3 3.5l10 9L3 20.5V3.5z" fill="#34a853"/>
          <path d="M13 12.5l5 4.5-15 3.5 10-8z" fill="#fbbc05"/>
          <path d="M13 12.5L3 3.5l15 3.5-5 5.5z" fill="#ea4335"/>
        </svg>
        <span className="text-[11px] text-[#86868b] font-medium">Google Play</span>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e8e8ed] to-[#d2d2d7] shrink-0 flex items-center justify-center">
            <span className="text-[20px]">📱</span>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#1d1d1f] leading-tight">{listing.title || "—"}</p>
            {listing.shortDescription && (
              <p className="text-[12px] text-[#6e6e73] mt-0.5">{listing.shortDescription}</p>
            )}
          </div>
        </div>
        {listing.description && (
          <p className="text-[12px] text-[#6e6e73] leading-relaxed line-clamp-3">{listing.description}</p>
        )}
        {listing.whatsNew && (
          <div className="mt-3 px-2 py-1.5 bg-[#f0faf4] rounded-lg">
            <p className="text-[10px] text-[#1d7a47] font-semibold uppercase tracking-wide mb-0.5">What&apos;s New</p>
            <p className="text-[11px] text-[#1d1d1f] leading-relaxed line-clamp-2">{listing.whatsNew}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function StorePreview({
  iosId,
  googlePlayId,
  ratingsAvg,
  store,
}: {
  iosId: string | null;
  googlePlayId: string | null;
  ratingsAvg: number | null;
  store?: "ios" | "android";
}) {
  const [iosListing, androidListing] = await Promise.all([
    iosId && store !== "android" ? fetchIosListing(iosId) : null,
    googlePlayId && store !== "ios" ? fetchAndroidListing(googlePlayId) : null,
  ]);

  if (!iosListing && !androidListing) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-[#1d1d1f]">現在のストア掲載</p>
        <Stars rating={ratingsAvg} />
      </div>
      <div className={`grid gap-4 ${iosListing && androidListing ? "grid-cols-2" : "grid-cols-1 max-w-sm"}`}>
        {iosListing && <IosCard listing={iosListing} />}
        {androidListing && <AndroidCard listing={androidListing} />}
      </div>
      <p className="text-[11px] text-[#c7c7cc]">
        現在ストアに掲載されているメタデータを表示しています（最新バージョン）
      </p>
    </div>
  );
}
