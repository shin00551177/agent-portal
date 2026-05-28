const BASE = "https://public-api.apptweak.com/api/public/store";

async function get(path: string, params: Record<string, string>) {
  const apiKey = process.env.APPTWEAK_API_KEY;
  if (!apiKey) throw new Error("APPTWEAK_API_KEY not set");

  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { "x-apptweak-key": apiKey },
  });

  if (!res.ok) throw new Error(`Apptweak ${path} → ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`Apptweak error: ${JSON.stringify(json.error)}`);
  return json;
}

// キーワード順位（最大5件ずつ）
export async function fetchKeywordRankings(
  iosId: string,
  keywords: string[],
  country = "jp",
  language = "ja",
): Promise<Record<string, { rank: number | null; installs: number | null }>> {
  const results: Record<string, { rank: number | null; installs: number | null }> = {};

  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5);
    const data = await get("/apps/keywords-rankings/current.json", {
      apps: iosId,
      keywords: batch.join(","),
      metrics: "rank,installs",
      device: "iphone",
      country,
      language,
    });
    const appData = data.result?.[iosId] ?? {};
    for (const kw of batch) {
      results[kw] = {
        rank: appData[kw]?.rank?.effective_value ?? null,
        installs: appData[kw]?.installs?.value ?? null,
      };
    }
  }
  return results;
}

// キーワードボリューム・難易度
export async function fetchKeywordMetrics(
  keywords: string[],
  country = "jp",
  language = "ja",
): Promise<Record<string, { volume: number | null; difficulty: number | null }>> {
  const results: Record<string, { volume: number | null; difficulty: number | null }> = {};

  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5);
    const data = await get("/keywords/metrics/current.json", {
      keywords: batch.join(","),
      metrics: "volume,difficulty",
      device: "iphone",
      country,
      language,
    });
    for (const kw of batch) {
      results[kw] = {
        volume: data.result?.[kw]?.volume?.value ?? null,
        difficulty: data.result?.[kw]?.difficulty?.value ?? null,
      };
    }
  }
  return results;
}

// アプリ指標（DL・売上・評価・App Power）
export async function fetchAppMetrics(iosId: string, country = "jp") {
  const data = await get("/apps/metrics/current.json", {
    apps: iosId,
    metrics: "downloads,revenues,ratings,app-power",
    country,
  });
  const app = data.result?.[iosId] ?? {};
  return {
    downloads: app.downloads?.value ?? null,
    revenues: app.revenues?.value ?? null,
    revenueCurrency: app.revenues?.currency ?? "USD",
    ratingsAvg: app.ratings?.value ?? null,
    ratingsTotal: app.ratings?.breakdown?.total ?? null,
    appPower: app["app-power"]?.value ?? null,
  };
}
