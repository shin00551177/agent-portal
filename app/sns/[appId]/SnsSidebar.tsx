"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Radar, Lightbulb, MessageCircle,
  Brain, BarChart2, AtSign, Settings,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: number };
type NavGroup = { label: string; items: NavItem[] };
type NavT = { dashboard: string; hypotheses: string; ego: string; feedback: string; frequency: string; learnings: string; accounts: string; settings: string; back: string; groups: { main: string; pdca: string; config: string } };

function makeGroups(appId: string, counts: { pending: number; unprocessedFb: number }, t: NavT): NavGroup[] {
  const base = `/sns/${appId}`;
  return [
    {
      label: t.groups.main,
      items: [
        { href: base, label: t.dashboard, icon: LayoutDashboard },
      ],
    },
    {
      label: t.groups.pdca,
      items: [
        { href: `${base}/ego`,        label: t.ego,        icon: Radar },
        { href: `${base}/hypotheses`, label: t.hypotheses, icon: Lightbulb, badge: counts.pending },
        { href: `${base}/feedback`,   label: t.feedback,   icon: MessageCircle, badge: counts.unprocessedFb },
        { href: `${base}/learnings`,  label: t.learnings,  icon: Brain },
        { href: `${base}/frequency`,  label: t.frequency,  icon: BarChart2 },
      ],
    },
    {
      label: t.groups.config,
      items: [
        { href: `${base}/accounts`, label: t.accounts, icon: AtSign },
        { href: `${base}/settings`, label: t.settings, icon: Settings },
      ],
    },
  ];
}

export function SnsSidebar({
  appId,
  appName,
  pendingHypotheses,
  unprocessedFeedback,
  t,
}: {
  appId: string;
  appName: string;
  pendingHypotheses: number;
  unprocessedFeedback: number;
  t: NavT;
}) {
  const pathname = usePathname();
  const groups = makeGroups(appId, { pending: pendingHypotheses, unprocessedFb: unprocessedFeedback }, t);

  function isActive(href: string) {
    if (href === `/sns/${appId}`) return pathname === `/sns/${appId}`;
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-48 flex-shrink-0 flex flex-col rounded-lg overflow-hidden nk-sidebar-gradient shadow-lg self-start sticky top-4">
      {/* App header */}
      <div className="px-4 py-4 border-b border-white/10">
        <Link href={`/sns/${appId}`} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-white/15 rounded-md flex items-center justify-center group-hover:bg-white/25 transition-colors">
            <span className="text-white font-bold text-sm">{appName[0]}</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">{appName}</p>
            <p className="text-white/40 text-[10px] mt-0.5 font-mono tracking-widest uppercase">SNS Agent</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-2 mb-1 text-[9px] font-semibold uppercase tracking-widest text-white/30 font-mono">
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon, badge }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-[12px] font-medium transition-all ${
                    active
                      ? "bg-[#079147] text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? "text-white" : "text-white/40"}`} />
                  <span className="flex-1">{label}</span>
                  {badge != null && badge > 0 && (
                    <span className="text-[10px] font-semibold bg-[#079147] text-white px-1.5 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Back link */}
      <div className="px-3 pb-3 border-t border-white/10 pt-3">
        <Link
          href="/sns"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] text-white/30 hover:text-white/60 hover:bg-white/5 transition-all font-mono"
        >
          {t.back}
        </Link>
      </div>
    </aside>
  );
}
