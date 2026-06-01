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
  const [app, pendingHypotheses, unprocessedFeedback] = await Promise.all([
    db.snsApp.findUnique({ where: { id: appId } }),
    db.snsHypothesis.count({ where: { appId, status: "pending" } }),
    db.snsProductFeedback.count({ where: { appId, processed: false } }),
  ]);
  if (!app) notFound();

  return (
    <div className="flex gap-6 items-start min-h-[calc(100vh-10rem)]">
      <SnsSidebar
        appId={appId}
        appName={app.name}
        pendingHypotheses={pendingHypotheses}
        unprocessedFeedback={unprocessedFeedback}
      />
      <div className="flex-1 min-w-0 py-1">
        {children}
      </div>
    </div>
  );
}
