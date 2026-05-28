export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EgoHitList } from "../EgoHitList";

export default async function EgoPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await db.snsApp.findUnique({ where: { id: appId } });
  if (!app) notFound();

  const egoHits = await db.egoHit.findMany({
    where: { appId },
    orderBy: [{ category: "asc" }, { score: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const active = egoHits.filter((h) => !h.dismissed).length;

  return (
    <div className="max-w-4xl">
      <EgoHitList appId={appId} initialHits={egoHits} />
    </div>
  );
}
