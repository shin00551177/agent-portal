import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { fetchAppPreviews } from "@/lib/asc";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { appId } = await params;

  const app = await db.asoApp.findUnique({ where: { id: appId } });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!app.iosId) return NextResponse.json({ previews: [] });

  const previews = await fetchAppPreviews(app.iosId).catch(() => []);
  return NextResponse.json({ previews });
}
