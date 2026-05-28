export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DraftList } from "../DraftList";

export default async function DraftsPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await db.snsApp.findUnique({ where: { id: appId } });
  if (!app) notFound();

  const drafts = await db.snsDraft.findMany({
    where: { appId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const pending = drafts.filter((d) => d.status === "pending").length;

  return (
    <div className="max-w-4xl">
      <DraftList appId={appId} initialDrafts={drafts} />
    </div>
  );
}
