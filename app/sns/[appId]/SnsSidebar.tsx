"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap, Video, TrendingUp, FileText, ClipboardList,
  Send, Search, Sparkles, MessageSquare, Users, Settings,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; items: NavItem[] };

function makeGroups(appId: string): NavGroup[] {
  const base = `/sns/${appId}`;
  return [
    {
      label: "リサーチ",
      items: [
        { href: `${base}/refs`,     label: "参考動画",   icon: Video },
        { href: `${base}/patterns`, label: "パターン",   icon: TrendingUp },
        { href: `${base}/ego`,      label: "エゴサ",     icon: Search },
      ],
    },
    {
      label: "制作",
      items: [
        { href: `${base}/analyze`,  label: "バズ動画分析", icon: Zap },
        { href: `${base}/scripts`,  label: "台本生成",     icon: FileText },
        { href: `${base}/briefs`,   label: "制作指示書",   icon: ClipboardList },
      ],
    },
    {
      label: "投稿管理",
      items: [
        { href: base,               label: "コンテンツ生成", icon: Sparkles },
        { href: `${base}/drafts`,   label: "下書き",         icon: Send },
      ],
    },
    {
      label: "AI",
      items: [
        { href: `${base}/agent`,    label: "AIアシスタント", icon: MessageSquare },
      ],
    },
    {
      label: "設定",
      items: [
        { href: `${base}/accounts`, label: "アカウント",     icon: Users },
        { href: `${base}/settings`, label: "設定",           icon: Settings },
      ],
    },
  ];
}

export function SnsSidebar({
  appId,
  appName,
  pendingDrafts,
  activeEgoHits,
}: {
  appId: string;
  appName: string;
  pendingDrafts: number;
  activeEgoHits: number;
}) {
  const pathname = usePathname();
  const groups = makeGroups(appId);

  const badges: Record<string, number> = {
    [`/sns/${appId}/drafts`]: pendingDrafts,
    [`/sns/${appId}/ego`]:    activeEgoHits,
  };

  function isActive(href: string) {
    if (href === `/sns/${appId}`) return pathname === `/sns/${appId}`;
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col rounded-2xl overflow-hidden bg-white border border-[#e8e8ed] self-start sticky top-4">
      {/* App header */}
      <div className="px-4 py-4 border-b border-[#f0f0f0]">
        <Link href={`/sns/${appId}`} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-[#f5f5f7] rounded-xl flex items-center justify-center group-hover:bg-[#ebebeb] transition-colors">
            <span className="text-[#1d1d1f] font-bold text-sm">{appName[0]}</span>
          </div>
          <div>
            <p className="text-[#1d1d1f] font-semibold text-sm leading-none">{appName}</p>
            <p className="text-[#86868b] text-[10px] mt-0.5">SNS Agent</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-2 mb-1 text-[9px] font-semibold uppercase tracking-widest text-[#c7c7cc]">
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              const badge = badges[href];
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all ${
                    active
                      ? "bg-[#f5f5f7] text-[#1d1d1f]"
                      : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? "text-[#1d1d1f]" : "text-[#c7c7cc]"}`} />
                  <span className="flex-1">{label}</span>
                  {badge != null && badge > 0 && (
                    <span className="text-[10px] font-semibold bg-[#1d1d1f] text-white px-1.5 py-0.5 rounded-full">
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
      <div className="px-3 pb-3 border-t border-[#f0f0f0] pt-3">
        <Link
          href="/sns"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] text-[#c7c7cc] hover:text-[#6e6e73] hover:bg-[#f5f5f7] transition-all"
        >
          ← SNS管理に戻る
        </Link>
      </div>
    </aside>
  );
}
