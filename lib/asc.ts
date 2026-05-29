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

// メタデータ更新（keywords / subtitle / description）
export async function updateLocalization(
  locId: string,
  fields: { keywords?: string; subtitle?: string; description?: string },
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
