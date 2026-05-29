import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getAppContext } from "@/lib/snsAppContext";

const client = new Anthropic();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const scripts = await db.snsScript.findMany({
    where: { appId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(scripts);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const body = await req.json();
  const { platform, targetAge, refVideoId, _mode } = body as {
    platform: string;
    targetAge?: string;
    refVideoId?: string;
    _mode?: string;
  };

  // save_only: フロントから生成済みデータを直接保存
  if (_mode === "save_only") {
    const saved = await db.snsScript.create({
      data: {
        appId,
        platform: platform ?? "TikTok",
        targetAge: targetAge ?? null,
        title: body.title ?? "Twomi台本",
        hook: body.hook ?? null,
        scriptContent: body.scriptContent ?? null,
        productionNotes: body.productionNotes ?? null,
        imagePrompts: body.imagePrompts ?? null,
        refVideoId: refVideoId ?? null,
      },
    });
    return NextResponse.json(saved, { status: 201 });
  }

  // パターン・参考動画をコンテキストとして注入
  const [patterns, refVideo] = await Promise.all([
    db.snsPattern.findMany({ where: { appId }, take: 8, orderBy: { createdAt: "desc" } }),
    refVideoId
      ? db.snsRefVideo.findUnique({ where: { id: refVideoId } })
      : db.snsRefVideo.findFirst({ where: { appId, analyzed: true }, orderBy: { views: "desc" } }),
  ]);

  const patternsText = patterns.length > 0
    ? patterns.map((p) => `- [${p.patternType}] ${p.title}: ${p.description}`).join("\n")
    : "（パターンデータなし）";

  const refText = refVideo
    ? `\n## 参考動画\n- フック: ${refVideo.hook ?? "不明"}\n- 構成: ${refVideo.structure ?? "不明"}\n- バズった理由: ${refVideo.whyBuzz ?? "不明"}\n- Twomi応用アイデア: ${refVideo.twomiIdea ?? "不明"}`
    : "";

  const appCtx = getAppContext(appId);

  const prompt = `あなたは${appCtx.name}のSNSコンテンツ専門家です。
【${appCtx.name}について】${appCtx.description} ターゲット: ${appCtx.target}
以下の成功パターンと参考動画をもとに、${platform ?? "TikTok"}向けの動画台本を生成してください。

## 成功パターン
${patternsText}
${refText}

ターゲット: ${targetAge ?? "10〜30代"}

必ずJSONのみで返してください:
{
  "title": "台本タイトル",
  "hook": "冒頭3秒のフック（視聴者を掴む一言）",
  "duration_sec": 30,
  "scriptContent": "完全な動画台本（フック→本編→CTA、ト書き付き、400〜600文字）",
  "productionNotes": "制作上の注意点（カメラ・テロップ・BGM・編集の提案）",
  "imagePrompts": "Higgsfield AI / DALL-E用の英語プロンプト（3パターン、改行区切り）"
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: "SNSコンテンツ制作の専門家として、指示されたJSON形式のみで返答してください。",
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  let data: Record<string, unknown> = {};
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) data = JSON.parse(m[0]);
  } catch {
    return NextResponse.json({ error: "AI応答のパースに失敗しました" }, { status: 500 });
  }

  const saved = await db.snsScript.create({
    data: {
      appId,
      platform: platform ?? "TikTok",
      targetAge: targetAge ?? null,
      title: (data.title as string) ?? "Twomi台本",
      hook: (data.hook as string) ?? null,
      scriptContent: (data.scriptContent as string) ?? null,
      productionNotes: (data.productionNotes as string) ?? null,
      imagePrompts: (data.imagePrompts as string) ?? null,
      refVideoId: refVideoId ?? null,
    },
  });

  return NextResponse.json(saved, { status: 201 });
}
