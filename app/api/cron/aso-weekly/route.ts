import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ASO週次最適化 cron — 旧 Mac cron (twomi-agents/scripts/aso-weekly-optimize.sh) の置き換え。
// 全アクティブアプリの sync → analyze を直列実行し、改善提案をポータルに蓄積する。
// トリガー: GitHub Actions (.github/workflows/aso-weekly.yml, 月曜 10:30 JST)

// 1アプリの sync → analyze を既存ルート経由で実行（SYNC_SECRET があればヘッダ付与）
async function runForApp(baseUrl: string, appId: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const syncSecret = process.env.SYNC_SECRET;
  if (syncSecret) headers["x-sync-secret"] = syncSecret;

  const syncRes = await fetch(`${baseUrl}/api/aso/${appId}/sync`, {
    method: "POST",
    headers,
    body: "{}",
  });
  if (!syncRes.ok) {
    const detail = (await syncRes.text().catch(() => "")).slice(0, 200);
    return { appId, ok: false, stage: "sync", status: syncRes.status, detail };
  }

  const analyzeRes = await fetch(`${baseUrl}/api/aso/${appId}/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify({ noReport: true }),
  });
  if (!analyzeRes.ok) {
    const detail = (await analyzeRes.text().catch(() => "")).slice(0, 200);
    return { appId, ok: false, stage: "analyze", status: analyzeRes.status, detail };
  }
  const analyzed = (await analyzeRes.json().catch(() => ({}))) as { proposalIds?: string[] };
  const proposals = Array.isArray(analyzed.proposalIds) ? analyzed.proposalIds.length : 0;
  return { appId, ok: true, proposals };
}

export async function POST(req: NextRequest) {
  // cronシークレット認証（sns-hypotheses と同方式）
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // 部分実行・デプロイ検証用: { "appId": "twomi" } で1アプリに限定できる
  const body = (await req.json().catch(() => ({}))) as { appId?: string };

  const apps = await db.asoApp.findMany({ where: { active: true } });
  const targets = body.appId ? apps.filter((a) => a.id === body.appId) : apps;
  if (targets.length === 0) {
    return NextResponse.json(
      { error: body.appId ? `app not found or inactive: ${body.appId}` : "no active apps" },
      { status: 404 },
    );
  }

  // 自己呼び出しはコンテナ内ループバック経由（公開URL経由はRailway環境でfetch failedになる）
  const baseUrl = `http://127.0.0.1:${process.env.PORT ?? 3000}`;

  // 旧スクリプト同様、Apptweakレートリミット配慮で直列実行。
  // per-app isolation: 1アプリの失敗で残りを止めない。
  const results = [];
  for (const app of targets) {
    try {
      results.push(await runForApp(baseUrl, app.id));
    } catch (e) {
      results.push({
        appId: app.id,
        ok: false,
        stage: "unexpected",
        status: 0,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const errors = results.filter((r) => !r.ok);
  if (errors.length > 0) {
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_ASO_CHANNEL ?? "U099KVBA7PA";
    if (token) {
      const text = `🚨 *ASO Weekly Cron エラー*\n${errors
        .map((e) => `• ${e.appId} (${e.stage}): HTTP ${e.status} ${e.detail ?? ""}`)
        .join("\n")}`;
      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channel, text }),
      }).catch(() => null);
    }
    console.error("[aso-weekly-cron] errors:", JSON.stringify(errors));
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() });
}
