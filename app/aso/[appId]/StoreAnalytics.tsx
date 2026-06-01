import { fetchStoreEngagementAnalytics, type StoreEngagementSummary } from "@/lib/asc";

// ─── Sparkline (SVG) ────────────────────────────────────────────────────────

function Sparkline({
  data,
  width = 200,
  height = 48,
  color = "#079147",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M ${pts.join(" L ")}`;
  const areaD = `M ${pts[0]} L ${pts.join(" L ")} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace("#", "")})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Source Bar ──────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  "App Store search":  { label: "検索",          color: "#079147" },
  "App Store browse":  { label: "ブラウズ",      color: "#34c759" },
  "Web referrer":      { label: "Web流入",        color: "#ff9f0a" },
  "App referrer":      { label: "アプリ経由",    color: "#5856d6" },
  "Institutional Purchase": { label: "法人",      color: "#86868b" },
};

function sourceInfo(src: string) {
  return SOURCE_LABELS[src] ?? { label: src, color: "#86868b" };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function AnalyticsContent({ data }: { data: StoreEngagementSummary }) {
  const cvrPct = data.cvr != null ? (data.cvr * 100).toFixed(1) : null;
  const sparkViews = data.dailyPageViews.slice(-14).map((d) => d.views);
  const sparkDL    = data.dailyPageViews.slice(-14).map((d) => d.downloads);

  return (
    <div className="space-y-6">
      {/* Period */}
      <p className="text-[12px] text-[#86868b]">
        📅 集計期間: {data.periodFrom} 〜 {data.periodTo}
      </p>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Page views */}
        <div className="border border-[#f0f0f0] rounded-2xl p-4 space-y-2">
          <p className="text-[11px] text-[#86868b]">ストアページ表示</p>
          <p className="text-[28px] font-semibold text-[#1d1d1f] leading-none">
            {data.pageViews.toLocaleString()}
          </p>
          <Sparkline data={sparkViews} color="#079147" />
        </div>

        {/* Downloads */}
        <div className="border border-[#f0f0f0] rounded-2xl p-4 space-y-2">
          <p className="text-[11px] text-[#86868b]">DL数（App Store）</p>
          <p className="text-[28px] font-semibold text-[#1d1d1f] leading-none">
            {data.downloads.toLocaleString()}
          </p>
          <Sparkline data={sparkDL} color="#34c759" />
        </div>

        {/* CVR */}
        <div className="border border-[#f0f0f0] rounded-2xl p-4">
          <p className="text-[11px] text-[#86868b] mb-2">CVR（表示→DL率）</p>
          <p className={`text-[36px] font-semibold leading-none ${
            data.cvr != null && data.cvr >= 0.05 ? "text-[#1d7a47]"
            : data.cvr != null && data.cvr >= 0.02 ? "text-[#a05c00]"
            : "text-red-500"
          }`}>
            {cvrPct != null ? `${cvrPct}%` : "—"}
          </p>
          <p className="text-[11px] text-[#86868b] mt-2">
            {data.cvr != null && data.cvr >= 0.05 ? "✓ 良好"
              : data.cvr != null && data.cvr >= 0.02 ? "⚠ 改善余地あり"
              : "⚠ 要改善"}
          </p>
          <p className="text-[10px] text-[#c7c7cc] mt-1">
            スクリーンショット変更後の変化を確認
          </p>
        </div>
      </div>

      {/* Source breakdown */}
      {data.sourceBreakdown.length > 0 && (
        <div>
          <p className="text-[13px] font-medium text-[#1d1d1f] mb-3">流入元内訳</p>
          <div className="space-y-2">
            {data.sourceBreakdown.slice(0, 5).map(({ source, views, pct }) => {
              const info = sourceInfo(source);
              return (
                <div key={source} className="flex items-center gap-3">
                  <span className="text-[12px] text-[#6e6e73] w-28 shrink-0 truncate">{info.label}</span>
                  <div className="flex-1 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: info.color }} />
                  </div>
                  <span className="text-[12px] font-semibold text-[#1d1d1f] w-10 text-right">{pct}%</span>
                  <span className="text-[11px] text-[#86868b] w-14 text-right">{views.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[#c7c7cc] mt-3">
            検索流入が高い → キーワード施策が効いている。ブラウズが高い → App Power・特集が寄与。
          </p>
        </div>
      )}
    </div>
  );
}

export async function StoreAnalytics({ iosId }: { iosId: string | null }) {
  if (!iosId) return null;

  const data = await fetchStoreEngagementAnalytics(iosId, 30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-[#1d1d1f]">
          App Store アナリティクス
        </p>
        <span className="text-[11px] text-[#86868b] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
          App Store Connect
        </span>
      </div>

      {data ? (
        <AnalyticsContent data={data} />
      ) : (
        <div className="py-8 text-center border border-dashed border-[#d2d2d7] rounded-2xl">
          <p className="text-[14px] text-[#6e6e73]">データを取得できませんでした</p>
          <p className="text-[12px] text-[#86868b] mt-1">
            ONGOING レポートの生成には数日かかる場合があります
          </p>
        </div>
      )}
    </div>
  );
}
