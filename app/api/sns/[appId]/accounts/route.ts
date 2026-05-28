import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const accounts = await db.snsAccount.findMany({
    where: { appId },
    orderBy: [{ platform: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(accounts);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const { platform, username, url, memo } = await req.json();

  if (!username?.trim()) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const account = await db.snsAccount.create({
    data: {
      appId,
      platform,
      username: username.trim(),
      url: url?.trim() || null,
      memo: memo?.trim() || null,
    },
  });

  return NextResponse.json(account, { status: 201 });
}
