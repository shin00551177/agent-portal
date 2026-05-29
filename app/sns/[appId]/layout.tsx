export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SnsSidebar } from "./SnsSidebar";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await db.snsApp.findUnique({
    where: { id: appId },
    include: {
      drafts:   { where: { status: "pending" } },
      egoHits:  { where: { dismissed: false } },
    },
  });
  if (!app) notFound();

  return (
    <div className="flex gap-6 items-start min-h-[calc(100vh-10rem)]">
      <SnsSidebar
        appId={appId}
        appName={app.name}
        pendingDrafts={app.drafts.length}
        activeEgoHits={app.egoHits.length}
      />
      <div className="flex-1 min-w-0 py-1">
        {children}
      </div>
    </div>
  );
}
