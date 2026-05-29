import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function detectPlatform(url: string): string {
  if (url.includes("tiktok.com")) return "TikTok";
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  if (url.includes("twitter.com") || url.includes("x.com")) return "X";
  return "その他";
}

export async function POST(request: NextRequest) {
  const { url } = await request.json();
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "無効なURLです" }, { status: 400 });
  }

  try {
    const ytdlpCmd = process.env.YTDLP_PATH ?? "yt-dlp";
    const { stdout } = await execFileAsync(
      ytdlpCmd,
      ["--dump-json", "--no-download", url],
      {
        timeout: 30000,
        env: {
          ...process.env,
          PATH: `/nix/var/nix/profiles/default/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
        },
      }
    );

    const raw = JSON.parse(stdout);
    return NextResponse.json({
      account: raw.uploader ?? raw.channel ?? raw.uploader_id ?? "",
      title: raw.title ?? "",
      views: raw.view_count ?? 0,
      likes: raw.like_count ?? 0,
      comments: raw.comment_count ?? 0,
      shares: raw.repost_count ?? 0,
      duration: raw.duration ? Math.round(raw.duration) : 0,
      postedDate: raw.upload_date
        ? `${raw.upload_date.slice(0, 4)}-${raw.upload_date.slice(4, 6)}-${raw.upload_date.slice(6, 8)}`
        : "",
      hashtags: raw.tags ? (raw.tags as string[]).slice(0, 20).join(" ") : "",
      bgm: raw.music_meta?.music_name ?? "",
      platform: detectPlatform(url),
      thumbnail: raw.thumbnail ?? "",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("ENOENT") || msg.includes("command not found")) {
      return NextResponse.json(
        { error: "yt-dlp がインストールされていません" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: `メタデータ取得失敗: ${msg.slice(0, 300)}` },
      { status: 500 }
    );
  }
}
