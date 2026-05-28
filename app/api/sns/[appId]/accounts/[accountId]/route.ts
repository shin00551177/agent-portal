import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ appId: string; accountId: string }> }
) {
  const { accountId } = await params;
  await db.snsAccount.delete({ where: { id: accountId } });
  return new NextResponse(null, { status: 204 });
}
