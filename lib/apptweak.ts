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

// バッチ配列を生成するヘルパー
function batches<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

// キーワード順位（5件ずつ並列）
export async function fetchKeywordRankings(
  iosId: string,
  keywords: string[],
  country = "jp",
  language = "ja",
): Promise<Record<string, { rank: number | null; installs: number | null }>> {
  const results = await Promise.all(
    batches(keywords, 5).map((batch) =>
      get("/apps/keywords-rankings/current.json", {
        apps: iosId, keywords: batch.join(","),
        metrics: "rank,installs", device: "iphone", country, language,
      }).then((data) => {
        const appData = data.result?.[iosId] ?? {};
        return batch.map((kw) => ({
          kw,
          rank: appData[kw]?.rank?.effective_value ?? null,
          installs: appData[kw]?.installs?.value ?? null,
        }));
      }).catch(() => batch.map((kw) => ({ kw, rank: null, installs: null })))
    )
  );
  return Object.fromEntries(results.flat().map(({ kw, rank, installs }) => [kw, { rank, installs }]));
}

// キーワードボリューム・難易度（5件ずつ並列）
export async function fetchKeywordMetrics(
  keywords: string[],
  country = "jp",
  language = "ja",
): Promise<Record<string, { volume: number | null; difficulty: number | null }>> {
  const results = await Promise.all(
    batches(keywords, 5).map((batch) =>
      get("/keywords/metrics/current.json", {
        keywords: batch.join(","),
        metrics: "volume,difficulty", device: "iphone", country, language,
      }).then((data) =>
        batch.map((kw) => ({
          kw,
          volume: data.result?.[kw]?.volume?.value ?? null,
          difficulty: data.result?.[kw]?.difficulty?.value ?? null,
        }))
      ).catch(() => batch.map((kw) => ({ kw, volume: null, difficulty: null })))
    )
  );
  return Object.fromEntries(results.flat().map(({ kw, volume, difficulty }) => [kw, { volume, difficulty }]));
}

// Android キーワード順位（5件ずつ並列）
export async function fetchAndroidKeywordRankings(
  packageName: string,
  keywords: string[],
  country = "jp",
  language = "ja",
): Promise<Record<string, { rank: number | null }>> {
  const results = await Promise.all(
    batches(keywords, 5).map((batch) =>
      get("/apps/keywords-rankings/current.json", {
        apps: packageName, keywords: batch.join(","),
        metrics: "rank", device: "android", country, language,
      }).then((data) => {
        const appData = data.result?.[packageName] ?? {};
        return batch.map((kw) => ({ kw, rank: appData[kw]?.rank?.effective_value ?? null }));
      }).catch(() => batch.map((kw) => ({ kw, rank: null })))
    )
  );
  return Object.fromEntries(results.flat().map(({ kw, rank }) => [kw, { rank }]));
}

// キーワード順位履歴（5件ずつ並列）
export async function fetchKeywordRankingHistory(
  iosId: string,
  keywords: string[],
  startDate: string,
  endDate: string,
  country = "jp",
  language = "ja",
): Promise<Record<string, Record<string, number | null>>> {
  const results = await Promise.all(
    batches(keywords, 5).map((batch) =>
      get("/apps/keywords-rankings/history.json", {
        apps: iosId, keywords: batch.join(","),
        metrics: "rank", device: "iphone", country, language,
        start_date: startDate, end_date: endDate,
      }).then((data) => {
        const appData = data.result?.[iosId] ?? {};
        return batch.map((kw) => {
          const rankHistory = appData[kw]?.rank ?? {};
          const byDate: Record<string, number | null> = {};
          if (Array.isArray(rankHistory)) {
            for (const entry of rankHistory as { date: string; effective_value: number | null }[]) {
              byDate[entry.date] = entry.effective_value;
            }
          } else if (typeof rankHistory === "object") {
            Object.entries(rankHistory).forEach(([date, val]) => {
              byDate[date] = (val as { effective_value?: number | null })?.effective_value ?? null;
            });
          }
          return { kw, byDate };
        });
      }).catch(() => batch.map((kw) => ({ kw, byDate: {} })))
    )
  );
  return Object.fromEntries(results.flat().map(({ kw, byDate }) => [kw, byDate]));
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

export async function fetchAndroidAppMetrics(packageName: string, country = "jp") {
  const data = await get("/apps/metrics/current.json", {
    apps: packageName,
    metrics: "downloads,revenues,ratings,app-power",
    device: "android",
    country,
  });
  const app = data.result?.[packageName] ?? {};
  return {
    downloads: app.downloads?.value ?? null,
    revenues: app.revenues?.value ?? null,
    revenueCurrency: app.revenues?.currency ?? "USD",
    ratingsAvg: app.ratings?.value ?? null,
    ratingsTotal: app.ratings?.breakdown?.total ?? null,
    appPower: app["app-power"]?.value ?? null,
  };
}
