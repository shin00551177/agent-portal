import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { isAuthenticated } from "@/lib/auth";

// PATCH /api/proposals/[id]  — 意思決定（approve / reject / choose option）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { decision, rejectionReason } = body as { decision: string; rejectionReason?: string };

  if (!decision) {
    return NextResponse.json({ error: "decision required" }, { status: 400 });
  }

  const proposal = await db.proposal.findUnique({ where: { id } });
  if (!proposal) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (proposal.status !== "pending") {
    return NextResponse.json({ error: "already decided" }, { status: 409 });
  }

  const status = decision === "no" ? "rejected" : "approved";

  const updated = await db.proposal.update({
    where: { id },
    data: {
      decision,
      status,
      decidedAt: new Date(),
      ...(decision === "no" && rejectionReason?.trim()
        ? { rejectionReason: rejectionReason.trim() }
        : {}),
    },
  });

  await writeAuditLog({
    action: decision === "no" ? "proposal_rejected" : "proposal_approved",
    targetTable: "Proposal",
    targetId: id,
    beforeValue: { status: "pending" },
    afterValue:  { status, decision },
    req,
  });

  return NextResponse.json(updated);
}
