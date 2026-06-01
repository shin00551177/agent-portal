// App Store Connect API client

const BASE = "https://api.appstoreconnect.apple.com";

export async function makeToken(): Promise<string> {
  const keyId     = process.env.APPLE_IAP_KEY_ID;
  const issuerId  = process.env.APPLE_IAP_ISSUER_ID;
  const keyB64    = process.env.APPLE_IAP_PRIVATE_KEY_B64;
  if (!keyId || !issuerId || !keyB64) throw new Error("Apple API credentials not set");

  const { default: jwt } = await import("jsonwebtoken");
  const privateKey = Buffer.from(keyB64, "base64").toString("utf-8");
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: issuerId, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" },
    privateKey,
    { algorithm: "ES256", header: { kid: keyId, alg: "ES256" } }
  );
}

async function asc(path: string, options: RequestInit = {}) {
  const token = await makeToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw Object.assign(new Error(`ASC ${res.status}: ${body.slice(0, 200)}`), {
      status: res.status,
      body,
    });
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── App Store Analytics ──────────────────────────────────────────────────────

export type StoreEngagementRow = {
  date: string;
  event: string;       // "Page view" | "App Unit" (download)
  pageType: string;    // "Product page" | "Store sheet"
  sourceType: string;  // "App Store search" | "Web referrer" | "App referrer" | ...
  counts: number;
  uniqueCounts: number;
};

export type StoreEngagementSummary = {
  periodFrom: string;
  periodTo: string;
  pageViews: number;
  downloads: number;
  cvr: number | null;           // downloads / pageViews
  sourceBreakdown: { source: string; views: number; pct: number }[];
  dailyPageViews: { date: string; views: number; downloads: number }[];
};

async function downloadSegment(url: string): Promise<StoreEngagementRow[]> {
  const res = await fetch(url);
  if (!res.ok) return [];
  const buffer = await res.arrayBuffer();
  let text: string;
  try {
    const { gunzipSync } = await import("zlib");
    text = gunzipSync(Buffer.from(buffer)).toString("utf-8");
  } catch {
    text = Buffer.from(buffer).toString("utf-8");
  }
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  // header: Date App_Name App_Apple_Identifier Event Page_Type Source_Type Engagement_Type Device Platform_Version Territory Counts Unique_Counts
  const rows: StoreEngagementRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split("\t");
    if (cols.length < 12) continue;
    rows.push({
      date:         cols[0],
      event:        cols[3],
      pageType:     cols[4],
      sourceType:   cols[5],
      counts:       parseInt(cols[10] ?? "0", 10) || 0,
      uniqueCounts: parseInt(cols[11] ?? "0", 10) || 0,
    });
  }
  return rows;
}

export async function fetchStoreEngagementAnalytics(
  iosId: string,
  days = 30,
): Promise<StoreEngagementSummary | null> {
  try {
    const token = await makeToken();
    const h = { Authorization: `Bearer ${token}` };

    // 1. ONGOING リクエストIDを取得
    const reqRes = await fetch(
      `https://api.appstoreconnect.apple.com/v1/apps/${iosId}/analyticsReportRequests?limit=1`,
      { headers: h }
    );
    if (!reqRes.ok) return null;
    const reqData = await reqRes.json();
    const requestId = reqData.data?.[0]?.id;
    if (!requestId) return null;

    // 2. Discovery & Engagement レポートを探す
    const repsRes = await fetch(
      `https://api.appstoreconnect.apple.com/v1/analyticsReportRequests/${requestId}/reports?limit=200`,
      { headers: h }
    );
    if (!repsRes.ok) return null;
    const repsData = await repsRes.json();
    const engagementReport = repsData.data?.find(
      (r: { attributes: { name: string; category: string } }) =>
        r.attributes.category === "APP_STORE_ENGAGEMENT" &&
        r.attributes.name.includes("Discovery and Engagement Standard")
    );
    if (!engagementReport) return null;

    // 3. 直近の instances を取得（最大 days 日分）
    const instsRes = await fetch(
      `https://api.appstoreconnect.apple.com/v1/analyticsReports/${engagementReport.id}/instances?limit=${days}`,
      { headers: h }
    );
    if (!instsRes.ok) return null;
    const instsData = await instsRes.json();
    const instances: { id: string; attributes: { processingDate: string } }[] =
      instsData.data ?? [];
    if (instances.length === 0) return null;

    // 4. 全インスタンスのセグメントをダウンロード
    const allRows: StoreEngagementRow[] = [];
    await Promise.all(instances.map(async (inst) => {
      const segRes = await fetch(
        `https://api.appstoreconnect.apple.com/v1/analyticsReportInstances/${inst.id}/segments`,
        { headers: h }
      );
      if (!segRes.ok) return;
      const segData = await segRes.json();
      const segUrl = segData.data?.[0]?.attributes?.url;
      if (!segUrl) return;
      const rows = await downloadSegment(segUrl);
      allRows.push(...rows);
    }));

    // 5. 集計
    const productPageViews = allRows.filter(
      (r) => r.event === "Page view" && r.pageType === "Product page"
    );
    const downloads = allRows.filter(
      (r) => r.event === "App Unit" || r.event === "Download"
    );

    const totalViews    = productPageViews.reduce((s, r) => s + r.counts, 0);
    const totalDownload = downloads.reduce((s, r) => s + r.counts, 0);

    // 流入元内訳
    const sourceMap: Record<string, number> = {};
    for (const r of productPageViews) {
      const src = r.sourceType || "Unknown";
      sourceMap[src] = (sourceMap[src] ?? 0) + r.counts;
    }
    const sourceBreakdown = Object.entries(sourceMap)
      .sort((a, b) => b[1] - a[1])
      .map(([source, views]) => ({
        source,
        views,
        pct: totalViews > 0 ? Math.round((views / totalViews) * 100) : 0,
      }));

    // 日次トレンド
    const dailyMap: Record<string, { views: number; downloads: number }> = {};
    for (const r of productPageViews) {
      if (!dailyMap[r.date]) dailyMap[r.date] = { views: 0, downloads: 0 };
      dailyMap[r.date].views += r.counts;
    }
    for (const r of downloads) {
      if (!dailyMap[r.date]) dailyMap[r.date] = { views: 0, downloads: 0 };
      dailyMap[r.date].downloads += r.counts;
    }
    const dailyPageViews = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    const dates = dailyPageViews.map((d) => d.date);

    return {
      periodFrom:     dates[0]  ?? "",
      periodTo:       dates[dates.length - 1] ?? "",
      pageViews:      totalViews,
      downloads:      totalDownload,
      cvr:            totalViews > 0 ? totalDownload / totalViews : null,
      sourceBreakdown,
      dailyPageViews,
    };
  } catch (e) {
    console.error("[StoreAnalytics]", e);
    return null;
  }
}

// 現在公開中のスクリーンショットURLを取得
export async function fetchAscScreenshots(
  iosId: string,
  locale = "ja",
): Promise<{ screenshots: string[]; previewUrl: string | null }> {
  try {
    const token = await makeToken();
    const h = { Authorization: `Bearer ${token}` };

    // 最新 READY_FOR_SALE バージョンを取得
    const verRes = await fetch(
      `https://api.appstoreconnect.apple.com/v1/apps/${iosId}/appStoreVersions?filter[platform]=IOS&filter[appStoreState]=READY_FOR_SALE&limit=1`,
      { headers: h, next: { revalidate: 3600 } }
    );
    if (!verRes.ok) return { screenshots: [], previewUrl: null };
    const verData = await verRes.json();
    const versionId = verData.data?.[0]?.id;
    if (!versionId) return { screenshots: [], previewUrl: null };

    // ローカライズ一覧
    const locRes = await fetch(
      `https://api.appstoreconnect.apple.com/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
      { headers: h, next: { revalidate: 3600 } }
    );
    if (!locRes.ok) return { screenshots: [], previewUrl: null };
    const locData = await locRes.json();
    const loc = locData.data?.find((l: { attributes: { locale: string } }) => l.attributes.locale === locale)
      ?? locData.data?.[0];
    if (!loc) return { screenshots: [], previewUrl: null };

    // スクリーンショット取得
    const ssRes = await fetch(
      `https://api.appstoreconnect.apple.com/v1/appStoreVersionLocalizations/${loc.id}/appScreenshots?limit=4`,
      { headers: h, next: { revalidate: 3600 } }
    );
    if (!ssRes.ok) return { screenshots: [], previewUrl: null };
    const ssData = await ssRes.json();

    const screenshots: string[] = (ssData.data ?? [])
      .slice(0, 4)
      .map((s: { attributes: { imageAsset?: { templateUrl?: string } } }) => {
        const tmpl = s.attributes.imageAsset?.templateUrl;
        return tmpl ? tmpl.replace("{w}", "390").replace("{h}", "844").replace("{f}", "jpg").replace("{c}", "bb") : null;
      })
      .filter(Boolean);

    return { screenshots, previewUrl: screenshots[0] ?? null };
  } catch {
    return { screenshots: [], previewUrl: null };
  }
}

// 画像タイプ定義
export const ASC_IMAGE_TYPES = {
  APP_IPHONE_65: { label: "iPhone 6.5\" スクリーンショット", slot: "APP_IPHONE_65" },
  APP_IPHONE_61: { label: "iPhone 6.1\" スクリーンショット", slot: "APP_IPHONE_61" },
  APP_IPAD_PRO_3GEN_129: { label: "iPad Pro 12.9\" スクリーンショット", slot: "APP_IPAD_PRO_3GEN_129" },
} as const;

export type AscImageType = keyof typeof ASC_IMAGE_TYPES;

// App Store Connect 画像アップロード（3ステップ）
export async function uploadAscScreenshot(
  versionId: string,
  locId: string,
  imageType: AscImageType,
  imageData: ArrayBuffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  // Step 1: 予約
  const reservation = await asc("/v1/appScreenshots", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "appScreenshots",
        attributes: { fileSize: imageData.byteLength, fileName },
        relationships: {
          appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: locId } },
        },
      },
    }),
  });

  const screenshotId = reservation.data.id;
  const uploadOps = reservation.data.attributes.uploadOperations ?? [];

  // Step 2: S3 にアップロード
  for (const op of uploadOps) {
    const headers: Record<string, string> = {};
    for (const h of op.requestHeaders ?? []) headers[h.name] = h.value;
    await fetch(op.url, { method: op.method, headers, body: imageData });
  }

  // Step 3: 確認
  await asc(`/v1/appScreenshots/${screenshotId}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: {
        type: "appScreenshots",
        id: screenshotId,
        attributes: { uploaded: true },
      },
    }),
  });

  return screenshotId;
}

// 編集可能なバージョンを探す
const EDITABLE = new Set([
  "PREPARE_FOR_SUBMISSION", "REJECTED", "METADATA_REJECTED",
  "WAITING_FOR_REVIEW", "INVALID_BINARY", "DEVELOPER_REJECTED",
]);

export async function getEditableVersion(iosAppId: string): Promise<{ versionId: string; versionString: string } | null> {
  const data = await asc(`/v1/apps/${iosAppId}/appStoreVersions?filter[platform]=IOS&limit=5`);
  for (const v of (data?.data ?? [])) {
    if (EDITABLE.has(v.attributes.appStoreState)) {
      return { versionId: v.id, versionString: v.attributes.versionString };
    }
  }
  return null;
}

// ローカライズID取得
export async function getLocalizationId(versionId: string, locale: string): Promise<string | null> {
  const data = await asc(`/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`);
  for (const loc of (data?.data ?? [])) {
    if (loc.attributes.locale === locale) return loc.id;
  }
  return null;
}

// メタデータ更新（title / keywords / subtitle / description / promotionalText）
export async function updateLocalization(
  locId: string,
  fields: { keywords?: string; subtitle?: string; description?: string; name?: string; promotionalText?: string },
): Promise<void> {
  await asc(`/v1/appStoreVersionLocalizations/${locId}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: {
        type: "appStoreVersionLocalizations",
        id: locId,
        attributes: fields,
      },
    }),
  });
}

// ─── フルメタデータ取得 ─────────────────────────────────────────────────────

export type IosFullListing = {
  title: string;
  subtitle: string;
  keywords: string;
  description: string;
  promotionalText: string;
  whatsNew: string;
  locId: string;
};

export async function fetchIosFullListing(iosId: string, locale = "ja"): Promise<IosFullListing | null> {
  try {
    const data = await asc(`/v1/apps/${iosId}/appStoreVersions?filter[platform]=IOS&limit=1&sort=-createdDate`);
    const versionId = data?.data?.[0]?.id;
    if (!versionId) return null;
    const locData = await asc(`/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`);
    const loc = locData.data?.find((l: { attributes: { locale: string } }) => l.attributes.locale === locale)
      ?? locData.data?.[0];
    if (!loc) return null;
    return {
      title: loc.attributes.name ?? "",
      subtitle: loc.attributes.subtitle ?? "",
      keywords: loc.attributes.keywords ?? "",
      description: loc.attributes.description ?? "",
      promotionalText: loc.attributes.promotionalText ?? "",
      whatsNew: loc.attributes.whatsNew ?? "",
      locId: loc.id,
    };
  } catch {
    return null;
  }
}

// アプリアイコンURL取得
export async function fetchAppIconUrl(iosId: string): Promise<string | null> {
  try {
    const data = await asc(`/v1/apps/${iosId}?fields[apps]=iconAssetToken`);
    const asset = data?.data?.attributes?.iconAssetToken;
    if (!asset?.templateUrl) return null;
    return (asset.templateUrl as string)
      .replace("{w}", "256").replace("{h}", "256").replace("{f}", "jpg").replace("{c}", "bb");
  } catch {
    return null;
  }
}

// レビュー一覧取得（iOS）
export type AscReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  reviewerNickname: string;
  createdDate: string;
  territory: string;
};

export async function fetchIosReviews(iosId: string, limit = 20): Promise<AscReview[]> {
  try {
    const data = await asc(`/v1/apps/${iosId}/customerReviews?sort=-createdDate&limit=${limit}&filter[territory]=JPN,USA`);
    return (data?.data ?? []).map((r: {
      id: string;
      attributes: {
        rating: number; title: string; body: string;
        reviewerNickname: string; createdDate: string; territory: string;
      }
    }) => ({
      id: r.id,
      rating: r.attributes.rating,
      title: r.attributes.title ?? "",
      body: r.attributes.body ?? "",
      reviewerNickname: r.attributes.reviewerNickname ?? "",
      createdDate: r.attributes.createdDate ?? "",
      territory: r.attributes.territory ?? "",
    }));
  } catch {
    return [];
  }
}

// レビューへの返信
export async function replyToReview(reviewId: string, body: string): Promise<void> {
  await asc(`/v1/customerReviewResponses`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "customerReviewResponses",
        attributes: { responseBody: body },
        relationships: { review: { data: { type: "customerReviews", id: reviewId } } },
      },
    }),
  });
}

// App Preview（動画）取得
export type AppPreview = {
  id: string;
  sourceFileChecksum: string | null;
  videoUrl: string | null;
  previewFrameTimeCode: string | null;
  mimeType: string | null;
  previewType: string;
  previewImage: string | null;
};

export async function fetchAppPreviews(iosId: string, locale = "ja"): Promise<AppPreview[]> {
  try {
    const verData = await asc(`/v1/apps/${iosId}/appStoreVersions?filter[platform]=IOS&filter[appStoreState]=READY_FOR_SALE&limit=1`);
    const versionId = verData?.data?.[0]?.id;
    if (!versionId) return [];
    const locData = await asc(`/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`);
    const loc = locData.data?.find((l: { attributes: { locale: string } }) => l.attributes.locale === locale)
      ?? locData.data?.[0];
    if (!loc) return [];
    const pvData = await asc(`/v1/appStoreVersionLocalizations/${loc.id}/appPreviews?limit=10`);
    return (pvData?.data ?? []).map((p: {
      id: string;
      attributes: {
        sourceFileChecksum: string | null; videoUrl: string | null;
        previewFrameTimeCode: string | null; mimeType: string | null;
        previewType: string; previewImage: { templateUrl?: string } | null;
      }
    }) => ({
      id: p.id,
      sourceFileChecksum: p.attributes.sourceFileChecksum,
      videoUrl: p.attributes.videoUrl,
      previewFrameTimeCode: p.attributes.previewFrameTimeCode,
      mimeType: p.attributes.mimeType,
      previewType: p.attributes.previewType,
      previewImage: p.attributes.previewImage?.templateUrl
        ? (p.attributes.previewImage.templateUrl as string).replace("{w}", "390").replace("{h}", "844").replace("{f}", "jpg").replace("{c}", "bb")
        : null,
    }));
  } catch {
    return [];
  }
}
