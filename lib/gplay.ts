// Google Play Developer API client

const BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

async function getAccessToken(): Promise<string> {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");

  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    credentials: JSON.parse(saJson),
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Failed to get Google access token");
  return token.token;
}

async function gplay(method: string, path: string, body?: unknown) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`GPlay ${res.status}: ${text.slice(0, 200)}`), { status: res.status });
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── Edit lifecycle ──────────────────────────────────────────────────────────

async function createEdit(packageName: string): Promise<string> {
  const data = await gplay("POST", `/${packageName}/edits`);
  return data.id;
}

async function commitEdit(packageName: string, editId: string): Promise<void> {
  await gplay("POST", `/${packageName}/edits/${editId}:commit`);
}

async function deleteEdit(packageName: string, editId: string): Promise<void> {
  await gplay("DELETE", `/${packageName}/edits/${editId}`).catch(() => {});
}

// ─── Public API ──────────────────────────────────────────────────────────────

// 画像タイプ定義
export const GPLAY_IMAGE_TYPES = {
  featureGraphic:       { label: "フィーチャーグラフィック", size: "1024×500px" },
  icon:                 { label: "アイコン",                size: "512×512px"   },
  phoneScreenshots:     { label: "スクリーンショット (Phone)", size: "最大8枚"  },
  sevenInchScreenshots: { label: "スクリーンショット (7inch)", size: "最大8枚"  },
} as const;

export type GPlayImageType = keyof typeof GPLAY_IMAGE_TYPES;

// 画像アップロード（Google Play）
export async function uploadGPlayImage(
  packageName: string,
  language: string,
  imageType: GPlayImageType,
  imageData: ArrayBuffer,
  mimeType: string,
  dryRun = false,
): Promise<{ url: string; sha1: string; dryRun: boolean }> {
  const token = await getAccessToken();
  const editId = await createEdit(packageName);

  try {
    const res = await fetch(
      `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${packageName}/edits/${editId}/listings/${language}/images/${imageType}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": mimeType,
        },
        body: imageData,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GPlay image upload ${res.status}: ${text.slice(0, 200)}`);
    }

    const result = await res.json();

    if (dryRun) {
      // ドライラン: コミットせず削除（審査には入らない）
      await deleteEdit(packageName, editId);
    } else {
      await commitEdit(packageName, editId);
    }

    return { url: result.image?.url ?? "", sha1: result.image?.sha1 ?? "", dryRun };
  } catch (err) {
    await deleteEdit(packageName, editId);
    throw err;
  }
}

// 現在公開中の画像を取得
export async function fetchGPlayImages(
  packageName: string,
  language = "ja-JP",
): Promise<{ featureGraphic: string | null; screenshots: string[] }> {
  const token = await getAccessToken();
  const editId = await createEdit(packageName);

  try {
    const [fgRes, ssRes] = await Promise.all([
      fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}/listings/${language}/images/featureGraphic`,
        { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}/listings/${language}/images/phoneScreenshots`,
        { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const fgData  = fgRes.ok  ? await fgRes.json()  : null;
    const ssData  = ssRes.ok  ? await ssRes.json()  : null;

    return {
      featureGraphic: fgData?.images?.[0]?.url ?? null,
      screenshots:    (ssData?.images ?? []).slice(0, 4).map((i: { url: string }) => i.url),
    };
  } finally {
    await deleteEdit(packageName, editId);
  }
}

export type PlayListing = {
  language: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
};

// メタデータ読み取り（ja / en-US）
export async function readListings(packageName: string): Promise<PlayListing[]> {
  const editId = await createEdit(packageName);
  try {
    const data = await gplay("GET", `/${packageName}/edits/${editId}/listings`);
    return (data?.listings ?? []).filter((l: PlayListing) =>
      ["ja-JP", "en-US"].includes(l.language)
    );
  } finally {
    await deleteEdit(packageName, editId);
  }
}

// メタデータ書き込み（1言語ずつ）
export async function updateListing(
  packageName: string,
  language: string,
  fields: Partial<{ title: string; shortDescription: string; fullDescription: string }>,
): Promise<void> {
  const editId = await createEdit(packageName);
  try {
    // 現在値を取得してマージ
    const current = await gplay("GET", `/${packageName}/edits/${editId}/listings/${language}`)
      .catch(() => ({})) as PlayListing;

    await gplay("PUT", `/${packageName}/edits/${editId}/listings/${language}`, {
      language,
      title:            fields.title            ?? current.title,
      shortDescription: fields.shortDescription ?? current.shortDescription,
      fullDescription:  fields.fullDescription  ?? current.fullDescription,
    });

    await commitEdit(packageName, editId);
  } catch (err) {
    await deleteEdit(packageName, editId);
    throw err;
  }
}
