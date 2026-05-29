import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function detectPlatform(url: string): string {
  if (url.includes("tiktok.com")) return "TikTok";
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  return "YouTube";
}

export async function POST(request: NextRequest) {
  const { keyword, platform = "YouTube", count = 10 } = await request.json();
  if (!keyword) return NextResponse.json({ error: "キーワードが必要です" }, { status: 400 });

  const ytdlpCmd = process.env.YTDLP_PATH ?? "yt-dlp";
  const env = {
    ...process.env,
    PATH: `/nix/var/nix/profiles/default/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
  };

  const searchTarget =
    platform === "TikTok" ? `ttsearch${count}:${keyword}` : `ytsearch${count}:${keyword}`;

  try {
    const { stdout } = await execFileAsync(
      ytdlpCmd,
      ["--dump-json", "--no-download", "--flat-playlist", searchTarget],
      { timeout: 60000, env }
    );

    const results = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          const r = JSON.parse(line);
          const url = r.url ?? r.webpage_url ?? "";
          return {
            url,
            account: r.uploader ?? r.channel ?? r.uploader_id ?? "",
            title: r.title ?? "",
            views: r.view_count ?? 0,
            likes: r.like_count ?? 0,
            duration: r.duration ? Math.round(r.duration) : 0,
            platform: detectPlatform(url),
            thumbnail: r.thumbnail ?? "",
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `検索失敗: ${msg.slice(0, 300)}` }, { status: 500 });
  }
}
