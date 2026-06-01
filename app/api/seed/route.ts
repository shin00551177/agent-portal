import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const SNS_APPS = [
  // accountKey: null = 全員に表示, "pt-BR"/"vi"/"id"/"bn" = 該当アカウントのみ
  { id: "buzzencer",     name: "BUZZENCER",    active: true,  platforms: ["youtube","tiktok","instagram","x"], locale: "pt-BR", accountKey: null },
  { id: "twomi",         name: "Twomi",        active: true,  platforms: ["youtube","tiktok","instagram","x","facebook","threads"], locale: "ja", accountKey: null },
  { id: "ai-avatar",     name: "AI AVATAR",    active: true,  platforms: ["youtube","tiktok","instagram","x"], locale: "ja", accountKey: "ja" },
  { id: "soulriza",      name: "SOULRiZA",     active: true,  platforms: ["youtube","tiktok","instagram","x"], locale: "ja", accountKey: "ja" },
  { id: "king-together", name: "KING Together", active: true,  platforms: ["youtube","tiktok","instagram","x"], locale: "ja", accountKey: "ja" },
  { id: "education",     name: "Education",    active: true,  platforms: ["youtube","instagram","x"], locale: "ja", accountKey: "ja" },
  { id: "pachinavi",     name: "パチナビ",     active: true,  platforms: ["youtube","tiktok","x"], locale: "ja", accountKey: "ja" },
];

export async function POST(req: NextRequest) {
  const expectedKey = process.env.PORTAL_API_KEY;
  if (expectedKey) {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== expectedKey) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const results: string[] = [];
  for (const app of SNS_APPS) {
    await db.snsApp.upsert({
      where: { id: app.id },
      create: app,
      update: { name: app.name, platforms: app.platforms, active: app.active, locale: (app as Record<string,unknown>).locale as string, accountKey: (app as Record<string,unknown>).accountKey as string | null },
    });
    results.push(`✓ ${app.name}`);
  }

  return NextResponse.json({ seeded: results });
}
