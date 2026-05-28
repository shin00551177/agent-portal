import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

// POST /api/governance-review
// GovernancePanelから呼ばれる。閾値変更をProposalとして登録し、/proposalsへのレビューを依頼する。
export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { domain, appId, appName, current, proposed } = body as {
    domain: "sns" | "aso";
    appId: string;
    appName: string;
    current: {
      escalationRules: Record<string, unknown>;
      haltConditions: Record<string, unknown>;
      fallbackBehavior: string;
    };
    proposed: {
      escalationRules: Record<string, unknown>;
      haltConditions: Record<string, unknown>;
      fallbackBehavior: string;
    };
  };

  if (!domain || !appId || !proposed) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const model = domain === "sns" ? "SnsApp" : "AsoApp";

  // Build human-readable change summary
  const changes: string[] = [];
  const escOld = current.escalationRules.threshold;
  const escNew = proposed.escalationRules.threshold;
  if (escOld !== escNew) changes.push(`エスカレーション閾値: ${escOld ?? "未設定"} → ${escNew}`);

  const haltOld = current.haltConditions.maxErrors;
  const haltNew = proposed.haltConditions.maxErrors;
  if (haltOld !== haltNew) changes.push(`停止条件 (最大エラー): ${haltOld ?? "未設定"} → ${haltNew}`);

  if (current.fallbackBehavior !== proposed.fallbackBehavior) {
    changes.push(`フォールバック: ${current.fallbackBehavior} → ${proposed.fallbackBehavior}`);
  }

  if (changes.length === 0) {
    return NextResponse.json({ error: "no changes detected" }, { status: 400 });
  }

  const summary = changes.join(" / ");

  const proposal = await db.proposal.create({
    data: {
      domain,
      targetType: `${domain}_app`,
      targetId: appId,
      title: `【閾値変更レビュー】${appName}`,
      summary,
      rationale: [
        `${appName} の稼働設定変更の承認を申請します。`,
        "",
        "■ 変更内容",
        ...changes.map((c) => `  • ${c}`),
        "",
        "■ 現在の設定",
        `  エスカレーション閾値: ${JSON.stringify(current.escalationRules)}`,
        `  停止条件: ${JSON.stringify(current.haltConditions)}`,
        `  フォールバック: ${current.fallbackBehavior}`,
        "",
        "■ 承認後に適用される設定",
        `  エスカレーション閾値: ${JSON.stringify(proposed.escalationRules)}`,
        `  停止条件: ${JSON.stringify(proposed.haltConditions)}`,
        `  フォールバック: ${proposed.fallbackBehavior}`,
      ].join("\n"),
      decisionType: "yesno",
      actionType: "update_governance",
      actionPayload: JSON.parse(JSON.stringify({
        model,
        appId,
        data: {
          escalationRules: proposed.escalationRules,
          haltConditions:  proposed.haltConditions,
          fallbackBehavior: proposed.fallbackBehavior,
        },
      })),
    },
  });

  await writeAuditLog({
    action: "governance_review_sent",
    targetTable: domain === "sns" ? "SnsApp" : "AsoApp",
    targetId: appId,
    beforeValue: current as Record<string, unknown>,
    afterValue:  proposed as Record<string, unknown>,
    req,
  });

  return NextResponse.json({ proposalId: proposal.id }, { status: 201 });
}
