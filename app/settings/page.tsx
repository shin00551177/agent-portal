import { NavShell } from "@/components/NavShell";

export default function SettingsPage() {
  return (
    <NavShell>
      <div className="max-w-2xl">
        <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight leading-[1.05] mb-2">
          設定
        </h1>
        <p className="text-[15px] text-[#6e6e73] mb-16">Agent Portal の全体設定</p>

        <div className="space-y-12">
          <section className="border-b border-[#f0f0f0] pb-12">
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight mb-1">ガバナンス</h2>
            <p className="text-[13px] text-[#6e6e73] mb-6">
              AI AGENT 行動規範 v0.1 (2026-05-27 制定)
            </p>
            <a
              href="https://www.notion.so/AI-AGENT-Governance-36d9a37c48cc810fbaf4f9f2a5800fd8"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] text-[#0071e3] hover:underline"
            >
              行動規範ドキュメントを開く →
            </a>
          </section>

          <section className="border-b border-[#f0f0f0] pb-12">
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight mb-1">各エージェントの設定</h2>
            <p className="text-[13px] text-[#6e6e73] mb-6">
              エスカレーション・停止条件・フォールバック動作はエージェントごとに設定できます。
            </p>
            <div className="space-y-3">
              {[
                { label: "SNS エージェント", href: "/sns" },
                { label: "ASO エージェント", href: "/aso" },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center justify-between px-4 py-3 bg-[#f5f5f7] hover:bg-[#ebebeb] rounded-xl transition-colors"
                >
                  <span className="text-[14px] font-medium text-[#1d1d1f]">{label}</span>
                  <span className="text-[13px] text-[#6e6e73]">アプリを選択 →</span>
                </a>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight mb-1">バージョン</h2>
            <p className="text-[13px] text-[#6e6e73]">
              Agent Portal · AI AGENT 行動規範 v0.1
            </p>
          </section>
        </div>
      </div>
    </NavShell>
  );
}
