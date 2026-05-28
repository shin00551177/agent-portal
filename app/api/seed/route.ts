import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const SNS_APPS = [
  { id: "twomi",         name: "Twomi",        active: true,  platforms: ["youtube","tiktok","instagram","x","facebook","threads"] },
  { id: "ai-avatar",     name: "AI AVATAR",    active: false, platforms: ["youtube","tiktok","instagram","x"] },
  { id: "soulriza",      name: "SOULRiZA",     active: false, platforms: ["youtube","tiktok","instagram","x"] },
  { id: "king-together", name: "KING Together", active: false, platforms: ["youtube","tiktok","instagram","x"] },
  { id: "education",     name: "Education",    active: false, platforms: ["youtube","instagram","x"] },
];

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PORTAL_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: string[] = [];
  for (const app of SNS_APPS) {
    await db.snsApp.upsert({
      where: { id: app.id },
      create: app,
      update: { name: app.name, platforms: app.platforms },
    });
    results.push(`✓ ${app.name}`);
  }

  return NextResponse.json({ seeded: results });
}
