import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

// POST /api/proposals/[id]/execute  — 承認済み提案を実行する
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const proposal = await db.proposal.findUnique({ where: { id } });
  if (!proposal) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (proposal.status !== "approved") {
    return NextResponse.json({ error: "proposal is not approved" }, { status: 409 });
  }

  await db.proposal.update({ where: { id }, data: { status: "executing" } });

  try {
    const result = await _execute(proposal);
    const updated = await db.proposal.update({
      where: { id },
      data: { status: "done", executedAt: new Date(), result: result as never },
    });
    await writeAuditLog({
      action: `proposal_executed:${proposal.actionType}`,
      targetTable: "Proposal",
      targetId: id,
      beforeValue: { status: "approved" },
      afterValue:  { status: "done", result },
      req,
    });
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.proposal.update({
      where: { id },
      data: { status: "failed", result: { error: message } as never },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --------------------------------------------------------------------------
// Executor: actionType ごとの実装
// --------------------------------------------------------------------------

async function _execute(proposal: {
  actionType: string;
  actionPayload: unknown;
  decision: string | null;
  targetId: string | null;
}): Promise<Record<string, unknown>> {
  const payload = (proposal.actionPayload ?? {}) as Record<string, unknown>;

  switch (proposal.actionType) {
    case "add_keywords":
      return _execAddKeywords(payload);

    case "update_setting":
      return _execUpdateSetting(payload);

    case "update_governance":
      return _execUpdateGovernance(payload);

    case "github_workflow":
      return _execGithubWorkflow(payload);

    case "manual":
      // 人間が手動で実施するアクション — 記録のみ
      return { note: "manual action — marked done by system" };

    default:
      throw new Error(`unknown actionType: ${proposal.actionType}`);
  }
}

async function _execAddKeywords(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const appId    = payload.appId    as string;
  const keywords = payload.keywords as string[];
  if (!appId || !keywords?.length) throw new Error("add_keywords: appId and keywords required");

  const created = await db.asoKeyword.createMany({
    data: keywords.map((kw) => ({
      appId,
      keyword:  kw,
      priority: (payload.priority as string) ?? "medium",
      active:   true,
    })),
    skipDuplicates: true,
  });

  return { created: created.count, keywords };
}

async function _execUpdateGovernance(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { model, appId, data } = payload as {
    model: string;
    appId: string;
    data: Record<string, unknown>;
  };

  if (model === "AsoApp") {
    await db.asoApp.update({ where: { id: appId }, data });
  } else if (model === "SnsApp") {
    await db.snsApp.update({ where: { id: appId }, data });
  } else {
    throw new Error(`update_governance: unsupported model ${model}`);
  }

  return { model, appId, applied: data };
}

async function _execUpdateSetting(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { model, id, field, value } = payload as {
    model: string; id: string; field: string; value: unknown;
  };

  if (model === "AsoApp") {
    await db.asoApp.update({ where: { id }, data: { [field]: value } });
  } else if (model === "SnsApp") {
    await db.snsApp.update({ where: { id }, data: { [field]: value } });
  } else {
    throw new Error(`update_setting: unsupported model ${model}`);
  }

  return { model, id, field, value };
}

async function _execGithubWorkflow(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { owner, repo, workflow_id, inputs } = payload as {
    owner: string; repo: string; workflow_id: string; inputs?: Record<string, string>;
  };

  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow_id}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs: inputs ?? {} }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub workflow dispatch failed: ${res.status} ${text}`);
  }

  return { owner, repo, workflow_id, dispatched: true };
}
