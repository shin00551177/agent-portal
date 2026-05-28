import { NextRequest, NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DEFAULT_REPO = process.env.GITHUB_REPO ?? "shin00551177/aso-agent";

export async function POST(req: NextRequest) {
  const { workflow, app, releaseDate, repo, platform, genre, count, language } = await req.json();
  if (!GITHUB_TOKEN) return NextResponse.json({ error: "GITHUB_TOKEN not set" }, { status: 500 });

  const GITHUB_REPO = repo ?? DEFAULT_REPO;
  const inputs: Record<string, string> = { app: app ?? "" };
  if (releaseDate) inputs.release_date = releaseDate;
  if (platform) inputs.platform = platform;
  if (genre) inputs.genre = genre;
  if (count) inputs.count = String(count);
  if (language) inputs.language = language;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
