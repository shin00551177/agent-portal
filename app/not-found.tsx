import Link from "next/link";
import { NavShell } from "@/components/NavShell";

export default function NotFound() {
  return (
    <NavShell>
      <div className="flex flex-col items-start py-20">
        <p className="text-[13px] text-[#86868b] mb-4">404</p>
        <h1 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight leading-tight mb-4">
          ページが見つかりません
        </h1>
        <p className="text-[17px] text-[#6e6e73] mb-10">
          お探しのページは移動または削除された可能性があります。
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-[#1d1d1f] hover:bg-black text-white rounded-xl text-[15px] font-medium transition-colors"
        >
          ホームに戻る
        </Link>
      </div>
    </NavShell>
  );
}
