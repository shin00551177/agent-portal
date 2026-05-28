// App Store Connect API client

const BASE = "https://api.appstoreconnect.apple.com";

async function makeToken(): Promise<string> {
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
