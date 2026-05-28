export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram",
  x: "X", facebook: "Facebook", threads: "Threads",
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default async function CalendarPage() {
  const [drafts] = await Promise.all([
    db.snsDraft.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { app: { select: { name: true } } },
    }),
  ]);

  type DraftWithApp = typeof drafts[number];
  const byWeek = new Map<string, DraftWithApp[]>();

  for (const draft of drafts) {
    const weekStart = getWeekStart(new Date(draft.createdAt));
    const key = weekStart.toISOString().slice(0, 10);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(draft);
  }

  const weeks = Array.from(byWeek.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  const pendingCount  = drafts.filter((d) => d.status === "pending").length;
  const approvedCount = drafts.filter((d) => d.status === "approved").length;

  return (
    <div>
      <div className="pb-16 border-b border-[#f0f0f0]">
        <h1 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight leading-[1.05]">コンテンツカレンダー</h1>
        <p className="text-[17px] text-[#6e6e73] mt-3">
          レビュー待ち {pendingCount} · 承認済み {approvedCount}
        </p>
      </div>

      {weeks.length === 0 ? (
        <p className="text-[#6e6e73] text-[15px] py-20 text-center">下書きがまだありません</p>
      ) : (
        <div className="divide-y divide-[#f0f0f0]">
          {weeks.map(([weekKey, weekDrafts]) => {
            const weekStart = new Date(weekKey + "T00:00:00");
            const weekEnd = addDays(weekStart, 6);

            const byDay = new Map<string, DraftWithApp[]>();
            for (const draft of weekDrafts) {
              const day = new Date(draft.createdAt).toISOString().slice(0, 10);
              if (!byDay.has(day)) byDay.set(day, []);
              byDay.get(day)!.push(draft);
            }

            return (
              <div key={weekKey} className="py-8">
                <div className="flex items-baseline justify-between mb-5">
                  <p className="text-[15px] font-medium text-[#1d1d1f]">
                    {formatDate(weekStart)} 〜 {formatDate(weekEnd)}
                  </p>
                  <p className="text-[13px] text-[#6e6e73]">{weekDrafts.length}件</p>
                </div>
                <div className="space-y-4">
                  {Array.from(byDay.entries())
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([day, dayDrafts]) => (
                      <div key={day} className="flex gap-6">
                        <p className="text-[12px] text-[#6e6e73] w-20 shrink-0 pt-0.5">
                          {new Date(day + "T00:00:00").toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}
                        </p>
                        <div className="flex flex-wrap gap-2 flex-1">
                          {dayDrafts.map((draft) => (
                            <Link
                              key={draft.id}
                              href={`/sns/${draft.appId}/drafts`}
                              className="border border-[#f0f0f0] rounded-xl px-4 py-3 text-[12px] max-w-xs hover:border-[#d2d2d7] transition-colors"
                            >
                              <div className="flex items-center gap-1.5 mb-1 text-[#6e6e73]">
                                <span className="font-medium text-[#1d1d1f]">{draft.app.name}</span>
                                <span>·</span>
                                <span>{PLATFORM_LABEL[draft.platform] ?? draft.platform}</span>
                                <span>·</span>
                                <span>
                                  {draft.status === "approved" ? "承認済み"
                                    : draft.status === "rejected" ? "却下"
                                    : "待ち"}
                                </span>
                              </div>
                              <p className="line-clamp-2 leading-relaxed text-[#1d1d1f]">{draft.copy}</p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
