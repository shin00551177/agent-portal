export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AccountManager } from "./AccountManager";

export default async function AccountsPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await db.snsApp.findUnique({ where: { id: appId } });
  if (!app) notFound();

  const accounts = await db.snsAccount.findMany({
    where: { appId },
    orderBy: [{ platform: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="max-w-4xl">
      <AccountManager appId={appId} initialAccounts={accounts} appName={app.name} />
    </div>
  );
}
