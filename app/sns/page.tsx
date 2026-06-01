export const dynamic = "force-dynamic";

import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { getAccountKey } from "@/lib/auth";

const PAGE_T: Record<string, { section: string; title: string; subtitle: string; proposal: string; proposalLabel: string; stats: string[]; appSection: string; noData: string; noCollection: string; action: string; negSection: string; empty: string; emptyDesc: string }> = {
  ja: {
    section: "SNS",
    title: "SNS エージェント",
    subtitle: "エゴサ · コンテンツ生成 · 直近7日間",
    proposal: "件 承認待ち →",
    proposalLabel: "エゴサ提案",
    stats: ["合計", "ネガティブ", "ポジティブ", "バズ"],
    appSection: "アプリ別",
    noData: "データなし",
    noCollection: "収集なし",
    action: "要対応",
    negSection: "要対応 — ネガティブ上位",
    empty: "直近7日間のデータなし",
    emptyDesc: "Ego Searchを実行するとここに表示されます",
  },
  "pt-BR": {
    section: "SNS",
    title: "Agente SNS",
    subtitle: "Monitoramento · Geração de conteúdo · Últimos 7 dias",
    proposal: " pendentes →",
    proposalLabel: "Propostas",
    stats: ["Total", "Negativo", "Positivo", "Viral"],
    appSection: "Por aplicativo",
    noData: "Sem dados",
    noCollection: "Sem coleta",
    action: "Ação necessária",
    negSection: "Ação necessária — Negativos principais",
    empty: "Sem dados nos últimos 7 dias",
    emptyDesc: "Execute o monitoramento para ver os dados aqui",
  },
  vi: {
    section: "SNS", title: "Đại lý SNS", subtitle: "Theo dõi · Tạo nội dung · 7 ngày gần nhất",
    proposal: " đang chờ →", proposalLabel: "Đề xuất",
    stats: ["Tổng", "Tiêu cực", "Tích cực", "Viral"],
    appSection: "Theo ứng dụng", noData: "Không có dữ liệu", noCollection: "Chưa thu thập",
    action: "Cần xử lý", negSection: "Cần xử lý — Tiêu cực hàng đầu",
    empty: "Không có dữ liệu trong 7 ngày qua", emptyDesc: "Chạy theo dõi để xem dữ liệu tại đây",
  },
  id: {
    section: "SNS", title: "Agen SNS", subtitle: "Pemantauan · Pembuatan konten · 7 hari terakhir",
    proposal: " menunggu →", proposalLabel: "Proposal",
    stats: ["Total", "Negatif", "Positif", "Viral"],
    appSection: "Per aplikasi", noData: "Tidak ada data", noCollection: "Belum dikumpulkan",
    action: "Perlu ditangani", negSection: "Perlu ditangani — Negatif utama",
    empty: "Tidak ada data dalam 7 hari terakhir", emptyDesc: "Jalankan pemantauan untuk melihat data di sini",
  },
  bn: {
    section: "SNS", title: "SNS এজেন্ট", subtitle: "মনিটরিং · কন্টেন্ট তৈরি · গত ৭ দিন",
    proposal: " অপেক্ষমাণ →", proposalLabel: "প্রস্তাব",
    stats: ["মোট", "নেতিবাচক", "ইতিবাচক", "ভাইরাল"],
    appSection: "অ্যাপ অনুযায়ী", noData: "কোনো ডেটা নেই", noCollection: "সংগ্রহ হয়নি",
    action: "পদক্ষেপ প্রয়োজন", negSection: "পদক্ষেপ প্রয়োজন — শীর্ষ নেতিবাচক",
    empty: "গত ৭ দিনে কোনো ডেটা নেই", emptyDesc: "ডেটা দেখতে মনিটরিং চালান",
  },
};

function timeAgo(date: Date, locale: string): string {
  const h = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (locale === "pt-BR") {
    if (h < 1)  return "Há menos de 1h";
    if (h < 24) return `Há ${h}h`;
    const d = Math.floor(h / 24);
    return d === 1 ? "Ontem" : `Há ${d} dias`;
  }
  if (h < 1)  return "1時間以内";
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return d === 1 ? "昨日" : `${d}日前`;
}

export default async function SnsPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const { locale: localeParam } = await searchParams;
  const accountKey = await getAccountKey(); // null = 管理者（全部見える）
  const validLocales = ["ja", "pt-BR", "vi", "id", "bn"];
  // ロケールはアカウントキーから自動決定（管理者はsearchParamsで切り替え可）
  const autoLocale = accountKey ?? "ja";
  const locale = validLocales.includes(localeParam ?? "") ? localeParam! : autoLocale;
  const t = PAGE_T[locale] ?? PAGE_T["ja"];
  const since7d = new Date(Date.now() - 7 * 86_400_000);

  const [apps, pendingProposals, recentHits] = await Promise.all([
    db.snsApp.findMany({
      where: {
        active: true,
        // 管理者(null)は全部、それ以外は自分のアカウントキー or null(共通)のアプリのみ
        ...(accountKey ? {
          OR: [
            { accountKey: null },
            { accountKey: accountKey },
          ],
        } : {}),
      },
      orderBy: { name: "asc" },
    }).then((list) => [
      ...list.filter((a) => a.id === "buzzencer"),
      ...list.filter((a) => a.id !== "buzzencer"),
    ]),
    db.proposal.count({ where: { status: "pending", domain: "ego" } }),
    db.egoHit.findMany({
      where: { createdAt: { gte: since7d } },
      orderBy: { score: "desc" },
      take: 200,
    }),
  ]);

  const total    = recentHits.length;
  const negative = recentHits.filter((h) => h.sentiment === "negative").length;
  const positive = recentHits.filter((h) => h.sentiment === "positive").length;
  const buzz     = recentHits.filter((h) => h.category === "buzz").length;

  const hitsByApp = apps.map((app) => {
    const hits   = recentHits.filter((h) => h.appId === app.id);
    const neg    = hits.filter((h) => h.sentiment === "negative").length;
    const latest = hits[0]?.createdAt;
    return { ...app, hitCount: hits.length, negCount: neg, latest };
  });

  const topNegative = recentHits.filter((h) => h.sentiment === "negative").slice(0, 5);

  return (
    <>
      <div className="pb-10 border-b border-[#f0f0f0]">
        <div className="flex items-start justify-between mb-4">
          <p className="text-[13px] text-[#6e6e73] uppercase tracking-wide">{t.section}</p>
          <Suspense>
            <LocaleSwitcher current={locale} />
          </Suspense>
        </div>
        <h1 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
          {t.title}
        </h1>
        <p className="text-[15px] text-[#6e6e73] mt-2">{t.subtitle}</p>
        {pendingProposals > 0 && (
          <Link
            href="/proposals?domain=ego"
            className="inline-flex items-center gap-2 mt-6 text-[15px] text-[#079147] hover:underline"
          >
            <span className="w-2 h-2 bg-[#079147] rounded-full animate-pulse" />
            {t.proposalLabel} {pendingProposals}{t.proposal}
          </Link>
        )}
      </div>

      {/* サマリー */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <div className="grid grid-cols-4 divide-x divide-[#f0f0f0]">
          {[total, negative, positive, buzz].map((n, i) => (
            <div key={i} className="px-6 first:pl-0 last:pr-0">
              <p className="text-[40px] font-semibold text-[#1d1d1f] leading-none">{n}</p>
              <p className="text-[13px] text-[#6e6e73] mt-1">{t.stats[i]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* アプリ別 */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <p className="text-[13px] text-[#6e6e73] uppercase tracking-wide mb-6">{t.appSection}</p>
        <div className="divide-y divide-[#f0f0f0]">
          {hitsByApp.map((app) => {
            const appLocale = (app as { locale?: string }).locale ?? "ja";
            return (
              <Link
                key={app.id}
                href={`/sns/${app.id}`}
                className="flex items-center justify-between py-4 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center flex-shrink-0">
                    <span className="text-[14px] font-semibold text-[#1d1d1f]">{app.name[0]}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-medium text-[#1d1d1f] group-hover:text-[#079147] transition-colors">
                        {app.name}
                      </p>
                      {appLocale === "pt-BR" && (
                        <span className="text-[10px] bg-[#f0faf4] text-[#079147] border border-[#a8e4bc] px-1.5 py-0.5 rounded-full font-medium">🇧🇷 PT</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#86868b]">
                      {app.latest ? timeAgo(new Date(app.latest), locale) : t.noData}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {app.hitCount > 0 ? (
                    <>
                      <span className="text-[15px] font-medium text-[#1d1d1f]">{app.hitCount}{locale === "pt-BR" ? "" : "件"}</span>
                      {app.negCount > 0 && (
                        <span className="text-[13px] text-red-500">{app.negCount} {t.action}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-[13px] text-[#86868b]">{t.noCollection}</span>
                  )}
                  <span className="text-[#6e6e73] text-[20px] font-light group-hover:translate-x-0.5 transition-transform">›</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ネガティブ上位 */}
      {topNegative.length > 0 && (
        <section className="py-12">
          <p className="text-[13px] text-[#6e6e73] uppercase tracking-wide mb-6">{t.negSection}</p>
          <div className="divide-y divide-[#f0f0f0]">
            {topNegative.map((h) => (
              <a key={h.id} href={h.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start justify-between py-4 gap-6 group">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[#1d1d1f] group-hover:text-[#079147] transition-colors truncate">{h.title}</p>
                  {h.snippet && <p className="text-[12px] text-[#6e6e73] mt-0.5 line-clamp-1">{h.snippet}</p>}
                </div>
                <span className="text-[12px] text-[#86868b] bg-[#f5f5f7] px-2 py-0.5 rounded-full flex-shrink-0">
                  {SOURCE_LABEL[h.source] ?? h.source}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <div className="py-20 text-center">
          <p className="text-[17px] text-[#6e6e73]">{t.empty}</p>
          <p className="text-[14px] text-[#86868b] mt-2">{t.emptyDesc}</p>
        </div>
      )}
    </>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  appstore: "App Store", playstore: "Play Store",
  youtube: "YouTube", x: "X", instagram: "Instagram", tiktok: "TikTok", rss: "RSS", web: "Web",
};
