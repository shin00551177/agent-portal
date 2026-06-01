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
): Promise<{ featureGraphic: string | null; screenshots: string[] } | null> {
  try {
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
  } catch (e) {
    console.error("[fetchGPlayImages] error:", (e as Error).message);
    return null;
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
  try {
    const editId = await createEdit(packageName);
    try {
      const data = await gplay("GET", `/${packageName}/edits/${editId}/listings`);
      return (data?.listings ?? []).filter((l: PlayListing) =>
        ["ja-JP", "en-US"].includes(l.language)
      );
    } finally {
      await deleteEdit(packageName, editId);
    }
  } catch (e) {
    console.error("[readListings] error:", (e as Error).message);
    return [];
  }
}

// レビュー一覧取得（Google Play）
export type PlayReview = {
  reviewId: string;
  authorName: string;
  rating: number;
  body: string;
  date: string;
  language: string;
  replyText: string | null;
  replyDate: string | null;
};

export async function fetchPlayReviews(packageName: string, maxResults = 20): Promise<PlayReview[]> {
  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/reviews?maxResults=${maxResults}&translationLanguage=ja`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.reviews ?? []).map((r: {
      reviewId: string;
      authorName: string;
      comments: { userComment?: { starRating?: number; text?: string; lastModified?: { seconds?: string }; reviewerLanguage?: string }; developerComment?: { text?: string; lastModified?: { seconds?: string } } }[];
    }) => {
      const user = r.comments?.find((c) => c.userComment)?.userComment;
      const dev = r.comments?.find((c) => c.developerComment)?.developerComment;
      return {
        reviewId: r.reviewId,
        authorName: r.authorName ?? "",
        rating: user?.starRating ?? 0,
        body: user?.text ?? "",
        date: user?.lastModified?.seconds ? new Date(parseInt(user.lastModified.seconds) * 1000).toISOString() : "",
        language: user?.reviewerLanguage ?? "",
        replyText: dev?.text ?? null,
        replyDate: dev?.lastModified?.seconds ? new Date(parseInt(dev.lastModified.seconds) * 1000).toISOString() : null,
      };
    });
  } catch {
    return [];
  }
}

// レビューへの返信（Google Play）
export async function replyToPlayReview(packageName: string, reviewId: string, replyText: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/reviews/${reviewId}:reply`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ replyText }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GPlay reply ${res.status}: ${text.slice(0, 200)}`);
  }
}

// What's New / Recent Changes 取得
export async function fetchPlayWhatsNew(packageName: string, language = "ja-JP"): Promise<string | null> {
  try {
    const editId = await createEdit(packageName);
    try {
      // 最新トラック（production）からwhatsnewを取得
      const tracksData = await gplay("GET", `/${packageName}/edits/${editId}/tracks`);
      const prodTrack = tracksData?.tracks?.find((t: { track: string }) => t.track === "production");
      const release = prodTrack?.releases?.[0];
      const notes = release?.releaseNotes?.find((n: { language: string }) => n.language === language);
      return notes?.text ?? null;
    } finally {
      await deleteEdit(packageName, editId);
    }
  } catch {
    return null;
  }
}

// アイコンURL取得（Google Play）
export async function fetchPlayIconUrl(packageName: string): Promise<string | null> {
  try {
    const editId = await createEdit(packageName);
    try {
      const data = await gplay("GET", `/${packageName}/edits/${editId}/images/icon`);
      const icons = data?.images ?? [];
      if (icons.length === 0) return null;
      return icons[icons.length - 1]?.url ?? null;
    } finally {
      await deleteEdit(packageName, editId);
    }
  } catch {
    return null;
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
