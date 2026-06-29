// panel の承認済み仮説（＝Content-lab向けブリーフ）を Content-lab の制作パイプライン入口に流し込む。
//
// 接続方式（案2）: Content-lab の Supabase REST(PostgREST) に service-role キーで直接 INSERT。
// repo は触らず疎結合の代わりに Content-lab の `videos` スキーマに依存する。
// videos は schema.sql に定義あり（url=unique not null / created_by=nullable / 他はデフォルトあり）。
//
// 着地先は `videos`（ネタ）行。Content-lab 側で人間(Wang/担当)が generate-brief → 動画生成(Higgsfield/Sora)
// の既存フローに乗せる＝"humans only confirm" のゲートを維持する（自動投稿はしない）。
//
// 必要 env（panel 側に設定）:
//   CONTENTLAB_SUPABASE_URL          … Content-lab の NEXT_PUBLIC_SUPABASE_URL
//   CONTENTLAB_SUPABASE_SERVICE_KEY  … Content-lab の SUPABASE_SERVICE_ROLE_KEY
// 未設定なら no-op（warn のみ）。コードを先行デプロイしても無害。

type HypothesisLike = {
  id: string;
  appId: string;
  platform: string;
  hypothesis: string;
  reasoning: string;
  targetAudience?: string | null;
  format?: string | null;
  contentBrief?: string | null;
};

// Content-lab の product 名（videos.product）。panel の appId → Content-lab プロダクト名へのマップ。
const APP_TO_PRODUCT: Record<string, string> = {
  twomi: "Twomi",
  "ai-avatar": "AI AVATAR",
  soulriza: "SOULRiZA",
  "king-together": "KING together",
  buzzencer: "BUZZENCER",
};

export async function pushIdeaToContentLab(h: HypothesisLike): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const base = process.env.CONTENTLAB_SUPABASE_URL;
  const key = process.env.CONTENTLAB_SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    console.warn("[contentlab] CONTENTLAB_SUPABASE_URL / _SERVICE_KEY 未設定 → push をスキップ");
    return { ok: false, skipped: true };
  }

  // url は unique not null。仮説IDで一意な合成URLにし、再briefedは on_conflict=url で upsert（重複行を作らない）。
  const endpoint = `${base.replace(/\/$/, "")}/rest/v1/videos?on_conflict=url`;
  const row = {
    url: `https://sns-panel.internal/${h.appId}/hypothesis/${h.id}`,
    platform: h.platform || "SNS",
    product: APP_TO_PRODUCT[h.appId] ?? h.appId,
    source: "sns-panel",
    title: h.hypothesis.slice(0, 200),
    why_buzz: h.reasoning,
    // contentBrief があればそれを制作アイデアに、無ければ仮説本文を入れる。
    soulriza_idea: h.contentBrief ?? h.hypothesis,
    target_age: h.targetAudience ?? null,
    visual_type: h.format ?? null,
    analyzed: true, // panel 側で構造化済みのネタ＝Content-lab の分析工程はスキップ可
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // url 衝突時は更新（再送で重複させない）。representation は不要なので最小化。
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[contentlab] push failed ${res.status}: ${text.slice(0, 300)}`);
      return { ok: false, error: `${res.status}` };
    }
    console.log(`[contentlab] idea pushed: ${h.appId}/${h.id}`);
    return { ok: true };
  } catch (e) {
    console.error(`[contentlab] push error:`, e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
