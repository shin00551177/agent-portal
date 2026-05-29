import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

type CaptionPattern = { label: string; caption: string; hashtags: string[] };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  await params; // appId available if needed for future context injection
  const { script, platform, targetAge } = await req.json();
  if (!script || !platform) {
    return NextResponse.json({ error: "script と platform が必要です" }, { status: 400 });
  }

  const prompt = `あなたはTwomi（AIアバターと会話・ビデオ通話できるアプリ）のSNSコピーライターです。
以下の台本・制作指示書をもとに、${platform}用のキャプションを3パターン生成してください。

プロダクト: Twomi
ターゲット: ${targetAge ?? "10〜30代"}
台本:
${script}

### パターンA（短め・インパクト重視）
{キャプション本文 100文字以内}
{ハッシュタグ 5個以内}

### パターンB（標準・説明あり）
{キャプション本文 150文字以内}
{ハッシュタグ 8個以内}

### パターンC（詳細・ストーリー型）
{キャプション本文 200文字以内}
{ハッシュタグ 10個以内}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  const patterns: CaptionPattern[] = [];
  const defs = [
    { key: "A", label: "パターンA（短め・インパクト重視）" },
    { key: "B", label: "パターンB（標準・説明あり）" },
    { key: "C", label: "パターンC（詳細・ストーリー型）" },
  ];

  for (let i = 0; i < defs.length; i++) {
    const cur = defs[i];
    const nxt = defs[i + 1];
    const startRe = new RegExp(`### パターン${cur.key}[^\n]*\n`, "i");
    const startMatch = text.match(startRe);
    if (!startMatch || startMatch.index === undefined) continue;

    const startIdx = startMatch.index + startMatch[0].length;
    let endIdx = text.length;
    if (nxt) {
      const nxtMatch = text.slice(startIdx).match(new RegExp(`### パターン${nxt.key}`, "i"));
      if (nxtMatch?.index !== undefined) endIdx = startIdx + nxtMatch.index;
    }

    const section = text.slice(startIdx, endIdx).trim();
    const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
    const hashtagLines = lines.filter((l) => l.includes("#"));
    const captionLines = lines.filter((l) => !l.includes("#"));

    patterns.push({
      label: cur.label,
      caption: captionLines.join("\n").trim(),
      hashtags: hashtagLines.join(" ").split(/\s+/).filter((t) => t.startsWith("#")),
    });
  }

  return NextResponse.json({ patterns });
}
