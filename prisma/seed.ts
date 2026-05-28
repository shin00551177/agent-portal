import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const ASO_APPS = [
  { id: "twomi",        name: "Twomi",        googlePlayId: "com.torilab.twomi",        iosId: "6756947139", active: true  },
  { id: "ai-avatar",    name: "AI AVATAR",    googlePlayId: "com.wallet.walkthedog",    iosId: "6443651909", active: false },
  { id: "soulriza",     name: "SOULRiZA",     googlePlayId: "com.soulriza.app",         iosId: "6749605293", active: false },
  { id: "king-together",name: "KING Together", googlePlayId: "com.aiavatarshogun.app",  iosId: "6761701026", active: false },
  { id: "education",    name: "Education",    googlePlayId: null,                        iosId: "6772054421", active: false },
];

const TWOMI_KEYWORDS = [
  { keyword: "AIアバター",      priority: "high" },
  { keyword: "AI 会話",         priority: "high" },
  { keyword: "チャット 無料",   priority: "high" },
  { keyword: "ビデオ通話 無料", priority: "high" },
  { keyword: "アバター 作成",   priority: "high" },
  { keyword: "AI チャット",     priority: "medium" },
  { keyword: "ライブ配信",      priority: "medium" },
  { keyword: "バーチャル アバター", priority: "medium" },
];

const APP_KEYWORDS: Record<string, { keyword: string; priority: string }[]> = {
  "ai-avatar": [
    { keyword: "AIアバター",      priority: "high" },
    { keyword: "アバター アプリ",  priority: "high" },
    { keyword: "バーチャル アバター", priority: "high" },
    { keyword: "AI キャラクター",  priority: "medium" },
    { keyword: "アバター 作成",    priority: "medium" },
  ],
  "soulriza": [
    { keyword: "ソウルライザ",     priority: "high" },
    { keyword: "スピリチュアル アプリ", priority: "high" },
    { keyword: "占い アプリ",      priority: "high" },
    { keyword: "タロット 無料",    priority: "medium" },
    { keyword: "占星術 アプリ",    priority: "medium" },
  ],
  "king-together": [
    { keyword: "KING Together",    priority: "high" },
    { keyword: "将軍 アプリ",      priority: "high" },
    { keyword: "AI 将軍",          priority: "high" },
    { keyword: "キャラクター チャット", priority: "medium" },
    { keyword: "歴史 AI",          priority: "medium" },
  ],
  "education": [
    { keyword: "教育 アプリ",      priority: "high" },
    { keyword: "学習 AI",          priority: "high" },
    { keyword: "英語 学習",        priority: "medium" },
    { keyword: "子供 アプリ",      priority: "medium" },
  ],
};

const SNS_APPS = [
  {
    id: "twomi",
    name: "Twomi",
    active: true,
    platforms: ["youtube", "tiktok", "instagram", "x", "facebook", "threads"],
  },
  {
    id: "ai-avatar",
    name: "AI AVATAR",
    active: false,
    platforms: ["youtube", "tiktok", "instagram", "x"],
  },
  {
    id: "soulriza",
    name: "SOULRiZA",
    active: false,
    platforms: ["youtube", "tiktok", "instagram", "x"],
  },
  {
    id: "king-together",
    name: "KING Together",
    active: false,
    platforms: ["youtube", "tiktok", "instagram", "x"],
  },
  {
    id: "education",
    name: "Education",
    active: false,
    platforms: ["youtube", "instagram", "x"],
  },
];

async function main() {
  for (const app of ASO_APPS) {
    await db.asoApp.upsert({ where: { id: app.id }, create: app, update: app });
    console.log(`✓ ASO ${app.name}`);
  }

  for (const kw of TWOMI_KEYWORDS) {
    await db.asoKeyword.upsert({
      where: { appId_keyword: { appId: "twomi", keyword: kw.keyword } },
      create: { appId: "twomi", ...kw },
      update: { priority: kw.priority },
    });
  }
  console.log(`✓ Twomi keywords (${TWOMI_KEYWORDS.length}件)`);

  for (const [appId, keywords] of Object.entries(APP_KEYWORDS)) {
    for (const kw of keywords) {
      await db.asoKeyword.upsert({
        where: { appId_keyword: { appId, keyword: kw.keyword } },
        create: { appId, ...kw },
        update: { priority: kw.priority },
      });
    }
    console.log(`✓ ${appId} keywords (${keywords.length}件)`);
  }

  for (const app of SNS_APPS) {
    await db.snsApp.upsert({ where: { id: app.id }, create: app, update: app });
    console.log(`✓ SNS ${app.name}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
