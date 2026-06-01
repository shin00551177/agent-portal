export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { SnsSidebar } from "./SnsSidebar";
import { getSnsT } from "@/lib/i18n/sns";
import { SnsLocaleProvider } from "./LocaleContext";

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

  const locale = (app as Record<string, unknown>).locale as string ?? "ja";
  const t = getSnsT(locale);

  const backLabel = t.nav.back;

  return (
    <SnsLocaleProvider locale={locale}>
      {/* 戻るボタン */}
      <div className="mb-6">
        <Link
          href="/sns"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#86868b] hover:text-[#1d1d1f] transition-colors group"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          <span className="group-hover:underline">{backLabel}</span>
        </Link>
      </div>

      <div className="flex gap-6 items-start min-h-[calc(100vh-10rem)]">
        <SnsSidebar
          appId={appId}
          appName={app.name}
          pendingHypotheses={pendingHypotheses}
          unprocessedFeedback={unprocessedFeedback}
          t={t.nav}
        />
        <div className="flex-1 min-w-0 py-1">
          {children}
        </div>
      </div>
    </SnsLocaleProvider>
  );
}
