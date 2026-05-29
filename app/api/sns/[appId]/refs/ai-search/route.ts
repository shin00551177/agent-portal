import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import Anthropic from "@anthropic-ai/sdk";

const execFileAsync = promisify(execFile);
const client = new Anthropic();

function detectPlatform(url: string): string {
  if (url.includes("tiktok.com")) return "TikTok";
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  return "YouTube";
}

export async function POST(request: NextRequest) {
  const { query, platform = "YouTube", count = 10 } = await request.json();
  if (!query) return NextResponse.json({ error: "クエリが必要です" }, { status: 400 });

  // ClaudeでTwomi向けの最適な検索キーワードを生成
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `あなたはSNSバズ動画リサーチの専門家です。
Twomi（AIアバターと会話・ビデオ通話できるアプリ）のコンテンツ参考になるバズ動画を探します。
以下のリクエストに対して、${platform}で検索する最適なキーワードを3つ生成してください。
キーワードは実際に${platform}で検索したときにバズ動画が出やすいものにしてください。

リクエスト: ${query}

JSONのみ返してください: {"keywords": ["キーワード1", "キーワード2", "キーワード3"]}`,
      },
    ],
  });

  let keywords: string[] = [];
  try {
    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) keywords = JSON.parse(m[0]).keywords ?? [];
  } catch {
    keywords = [query];
  }
  if (keywords.length === 0) keywords = [query];

  const ytdlpCmd = process.env.YTDLP_PATH ?? "yt-dlp";
  const env = {
    ...process.env,
    PATH: `/nix/var/nix/profiles/default/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
  };

  const seen = new Set<string>();
  const allResults: object[] = [];

  for (const kw of keywords) {
    if (allResults.length >= count) break;
    const searchTarget =
      platform === "TikTok" ? `ttsearch5:${kw}` : `ytsearch5:${kw}`;
    try {
      const { stdout } = await execFileAsync(
        ytdlpCmd,
        ["--dump-json", "--no-download", "--flat-playlist", searchTarget],
        { timeout: 45000, env }
      );
      for (const line of stdout.trim().split("\n").filter(Boolean)) {
        try {
          const r = JSON.parse(line);
          const url = r.url ?? r.webpage_url ?? "";
          if (url && !seen.has(url)) {
            seen.add(url);
            allResults.push({
              url,
              account: r.uploader ?? r.channel ?? r.uploader_id ?? "",
              title: r.title ?? "",
              views: r.view_count ?? 0,
              likes: r.like_count ?? 0,
              duration: r.duration ? Math.round(r.duration) : 0,
              platform: detectPlatform(url),
              thumbnail: r.thumbnail ?? "",
              matchedKeyword: kw,
            });
          }
        } catch { /* skip */ }
      }
    } catch { /* skip failed keyword */ }
  }

  return NextResponse.json({ keywords, results: allResults.slice(0, count) });
}
