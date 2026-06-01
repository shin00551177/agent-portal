import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { sendSlackError } from "@/lib/slack-alert";
import { fetchIosFullListing } from "@/lib/asc";
import { readListings } from "@/lib/gplay";

const client = new Anthropic();

type KwData = {
  keyword: string;
  rank: number | null;
  prevRank: number | null;
  volume: number | null;
  difficulty: number | null;
};

type AppMetrics = {
  downloads: number | null;
  revenues: number | null;
  revenueCurrency: string;
  ratingsAvg: number | null;
  ratingsTotal?: number | null;
  appPower: number | null;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  // セッション認証（ブラウザ）または未認証で許可（sync からの fire-and-forget 用）
  // sync エンドポイントと同様の方針
  const syncSecret = process.env.SYNC_SECRET;
  const authed = await isAuthenticated();
  if (!authed && syncSecret && req.headers.get("x-sync-secret") !== syncSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { appId } = await params;
  const reqBody = await req.json().catch(() => ({})) as { noReport?: boolean };

  const app = await db.asoApp.findUnique({ where: { id: appId } });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
  const [report, iosListing, androidListings] = await Promise.all([
    db.asoReport.findFirst({ where: { appId }, orderBy: { date: "desc" } }),
    app.iosId ? fetchIosFullListing(app.iosId).catch(() => null) : null,
    app.googlePlayId ? readListings(app.googlePlayId).catch(() => []) : [],
  ]);
  if (!report) return NextResponse.json({ error: "no report data" }, { status: 400 });
  const androidListing = (androidListings ?? []).find((l) => l.language === "ja-JP") ?? (androidListings ?? [])[0] ?? null;

  const data = report.data as { keywords?: KwData[]; appMetrics?: AppMetrics; periodFrom?: string; periodTo?: string };
  const keywords = data.keywords ?? [];
  const metrics = data.appMetrics;
  const periodFrom = data.periodFrom ?? report.date;
  const periodTo = data.periodTo ?? report.date;
  const periodDays = Math.round((new Date(periodTo).getTime() - new Date(periodFrom).getTime()) / 86400000);
  const periodLabel = periodFrom === periodTo ? periodTo : `${periodFrom} 〜 ${periodTo}（${periodDays}日間）`;

  const kwSummary = keywords
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((k) => {
      const rankStr = k.rank && k.rank < 500 ? `${k.rank}位` : "圏外";
      const trend = k.prevRank != null && k.rank != null && k.rank < 500 && k.prevRank < 500
        ? (k.rank < k.prevRank ? `↑${k.prevRank - k.rank}` : k.rank > k.prevRank ? `↓${k.rank - k.prevRank}` : "→")
        : "";
      return `  - ${k.keyword}: ${rankStr}${trend} | vol:${k.volume ?? "?"} diff:${k.difficulty ?? "?"}`;
    })
    .join("\n");

  // 過去30日の却下済み提案を取得（学習ループ #7）
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rejectedProposals = await db.proposal.findMany({
    where: { domain: "aso", targetId: appId, status: "rejected", decidedAt: { gte: since } },
    orderBy: { decidedAt: "desc" },
    take: 10,
    select: { title: true, summary: true, rejectionReason: true },
  });

  const rejectedSection = rejectedProposals.length > 0
    ? `\n## 過去に却下された提案（同じ提案を繰り返さないこと）\n${rejectedProposals
        .map((p) => `  - 「${p.title}」: ${p.summary}${p.rejectionReason ? `\n    却下理由: ${p.rejectionReason}` : ""}`)
        .join("\n")}\n`
    : "";

  // 現在のストアメタデータをまとめる
  const currentMeta = {
    ios: iosListing ? {
      title: iosListing.title,
      subtitle: iosListing.subtitle,
      keywords: iosListing.keywords,
      description: iosListing.description.slice(0, 150),
      promotionalText: iosListing.promotionalText,
      whatsNew: iosListing.whatsNew.slice(0, 200),
    } : null,
    android: androidListing ? {
      title: androidListing.title,
      shortDescription: androidListing.shortDescription,
      description: androidListing.fullDescription.slice(0, 150),
    } : null,
  };

  const metaSection = currentMeta.ios ? `
## 現在のストアメタデータ（iOS / 日本語）
- タイトル（${currentMeta.ios.title.length}/30文字）: "${currentMeta.ios.title}"
- サブタイトル（${currentMeta.ios.subtitle.length}/30文字）: "${currentMeta.ios.subtitle}"
- キーワードフィールド（${currentMeta.ios.keywords.length}/100文字）: "${currentMeta.ios.keywords}"
- プロモーションテキスト: "${currentMeta.ios.promotionalText || "（未設定）"}"
- 説明文（冒頭300文字）: "${currentMeta.ios.description}"
- What's New: "${currentMeta.ios.whatsNew || "（未設定）"}"
${currentMeta.android ? `
## 現在のストアメタデータ（Android / 日本語）
- タイトル: "${currentMeta.android.title}"
- ショート説明文: "${currentMeta.android.shortDescription}"` : ""}` : "";

  const prompt = `あなたはApp Store最適化（ASO）の専門家です。以下の ${app.name} のASO データを徹底的に分析し、考えられる全ての改善点を提案してください。

## エージェント行動規範
- 提案は必ず「結果→原因分析→ネクストアクション」の3点セットで構成する
- 人間（オーナー）の承認なしに直接変更を実行しない。提案形式のみとする
- 確信度 medium 以上の根拠がある提案のみ生成する（推測だけによる提案は不可）
- 過去に却下された提案と同じ内容・同じフィールドへの変更を繰り返さない
- **最大8件まで。優先度の高いものから順に出すこと**

## 分析対象（全要素を網羅的にチェックすること）
- タイトル: 文字数の最適化・主要KW含有
- サブタイトル: 30文字フル活用・補完KW投入
- キーワードフィールド: 100文字フル活用・重複排除・高ボリューム低競合KW
- 説明文: 冒頭3行（折りたたみ前）の訴求力・CTA・KW密度
- プロモーションテキスト: 季節性・キャンペーン・バージョン不要の強み
- What's New: 新機能訴求・KW含有
- App Power / DL数 / CVR: 数値の意味と改善アクション

## 集計期間: ${periodLabel}

## アプリ指標
- DL数: ${metrics?.downloads ?? "?"}
- 売上: $${metrics?.revenues ?? "?"} ${metrics?.revenueCurrency ?? "USD"}
- 評価: ${metrics?.ratingsAvg ?? "?"}（${metrics?.ratingsTotal ?? "?"}件）
- App Power: ${metrics?.appPower ?? "?"}/10

## キーワード順位
${kwSummary}
${metaSection}
${rejectedSection}
各提案は以下の3点セットで構成してください：
1. **結果**（現状の数値・事実のみ。判断・意見を含まない）
2. **原因分析**（なぜその結果になっているか。データに基づく推論）
3. **ネクストアクション**（具体的な変更内容と期待される効果）

以下のJSON配列形式で**最大8件の改善提案（優先度順）**を返してください。コードブロックや説明文は不要、JSONのみ返してください。

[
  {
    "title": "提案タイトル（20文字以内）",
    "summary": "1〜2文の要約（UI表示用）",
    "result": "【結果】現状の数値・事実（例: 「アバター」はvol:59にもかかわらず圏外）",
    "cause": "【原因分析】なぜこの結果になっているか（例: サブタイトルに「アバター」が含まれていないため検索インデックスに含まれていない可能性が高い）",
    "nextAction": "【ネクストアクション】具体的な変更内容と期待効果（例: サブタイトルを「AIアバターと話そう」に変更→アバターキーワードでTop50入り見込み）",
    "field": "title" | "subtitle" | "keywords" | "description" | "promotionalText" | "whatsNew" | "shortDescription",
    "currentValue": "現在の値（上記メタデータから引用）",
    "proposed": "変更後の具体的な値"
  }
]`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  type ProposalInput = {
    title: string;
    summary: string;
    result: string;
    cause: string;
    nextAction: string;
    field: string;
    currentValue: string;
    proposed: string;
  };

  // JSON 配列を堅牢に抽出（改行・特殊文字を含む長い出力に対応）
  function extractProposals(raw: string): ProposalInput[] {
    // 最初の [ から最後の ] を探す
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) return [];
    const jsonStr = raw.slice(start, end + 1);
    try {
      return JSON.parse(jsonStr);
    } catch {
      // フォールバック: 個別オブジェクトを抽出して配列化
      const items: ProposalInput[] = [];
      const objRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
      let m;
      while ((m = objRegex.exec(jsonStr)) !== null) {
        try { items.push(JSON.parse(m[0])); } catch { /* skip invalid */ }
      }
      return items;
    }
  }

  const proposals = extractProposals(text);
  if (proposals.length === 0) {
    console.error("[analyze] parse failed, raw length:", text.length);
    return NextResponse.json({ error: "parse failed", proposalIds: [] });
  }

  // 既存の pending 提案を古いものとして reject（重複防止）
  await db.proposal.updateMany({
    where: { domain: "aso", targetId: appId, status: "pending" },
    data: { status: "rejected", decision: "no", decidedAt: new Date() },
  });

  const created = await Promise.all(
    proposals.map((p) =>
      db.proposal.create({
        data: {
          domain: "aso",
          targetType: "aso_app",
          targetId: appId,
          title: p.title,
          summary: p.summary,
          rationale: JSON.stringify({
            result: p.result,
            cause: p.cause,
            nextAction: p.nextAction,
            field: p.field,
            currentValue: p.currentValue ?? "",
            proposed: p.proposed,
            periodLabel,
          }),
          decisionType: "yesno",
          actionType: "update_aso_metadata",
          actionPayload: { field: p.field, proposed: p.proposed, locale: "ja" },
          confidence: "medium",
        },
      })
    )
  );

  await writeAuditLog({
    action: "aso_analyze",
    targetTable: "Proposal",
    targetId: appId,
    afterValue: { proposalsCreated: created.length },
    req,
  });

  // 分析完了後の Slack レポート送信 — noReport=true の場合はスキップ（cronからの呼び出し用）
  const noReport = reqBody.noReport;
  if (!noReport) {
    // Railway内部では req.nextUrl.origin が解決不能になるため RAILWAY_PUBLIC_DOMAIN を優先
    const publicDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
    const baseUrl = publicDomain ? `https://${publicDomain}` : req.nextUrl.origin;
    const syncSecret = process.env.SYNC_SECRET;
    const reportHeaders: Record<string, string> = {};
    if (syncSecret) reportHeaders["x-sync-secret"] = syncSecret;
    fetch(`${baseUrl}/api/aso/${appId}/report`, { method: "POST", headers: reportHeaders })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.text().catch(() => r.statusText);
          await sendSlackError({ step: "report", appId, appName: app.name, error: `HTTP ${r.status}: ${body}` });
        }
      })
      .catch((err) => sendSlackError({ step: "report", appId, appName: app.name, error: err }));
  }

  return NextResponse.json({ proposalIds: created.map((p) => p.id) });
  } catch (err) {
    // noReport=true（cron経由）の場合はSlack通知しない
    if (!reqBody.noReport) {
      await sendSlackError({ step: "analyze", appId, appName: app?.name, error: err });
    }
    throw err;
  }
}
