import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const IDS = ["ai-avatar", "soulriza", "king-together", "education"];

export async function POST() {
  const results = await Promise.all(
    IDS.map((id) =>
      db.snsApp.updateMany({ where: { id }, data: { active: true } })
    )
  );
  return NextResponse.json({ updated: IDS, counts: results.map((r) => r.count) });
}
