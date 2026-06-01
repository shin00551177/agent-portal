import Link from "next/link";
import { fetchGPlayImages } from "@/lib/gplay";
import { fetchAscScreenshots } from "@/lib/asc";

type Props = {
  appId: string;
  iosId: string | null;
  googlePlayId: string | null;
};

function ImageCard({ src, label }: { src: string; label?: string }) {
  return (
    <div className="relative group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label ?? ""}
        className="w-full h-auto rounded-xl object-cover border border-[#f0f0f0] shadow-sm group-hover:shadow-md transition-shadow"
        loading="lazy"
      />
      {label && (
        <span className="absolute bottom-1.5 left-1.5 text-[10px] font-medium text-white bg-black/50 px-1.5 py-0.5 rounded-full">
          {label}
        </span>
      )}
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="w-full aspect-[9/16] rounded-xl border-2 border-dashed border-[#d2d2d7] bg-[#fafafa] flex items-center justify-center">
      <p className="text-[11px] text-[#c7c7cc]">未設定</p>
    </div>
  );
}

export async function StoreImages({ appId, iosId, googlePlayId }: Props) {
  const [iosData, androidData] = await Promise.all([
    iosId ? fetchAscScreenshots(iosId, "ja").catch(() => null) : null,
    googlePlayId ? fetchGPlayImages(googlePlayId, "ja-JP").catch(() => null) : null,
  ]);

  const hasAny =
    (iosData && iosData.screenshots.length > 0) ||
    (androidData && (androidData.featureGraphic || androidData.screenshots.length > 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-[#1d1d1f]">現在のストア画像</p>
        <Link
          href={`/aso/${appId}/settings`}
          className="text-[12px] text-[#0071e3] hover:underline flex items-center gap-1"
        >
          画像を更新 →
        </Link>
      </div>

      {!hasAny ? (
        <div className="py-8 text-center border border-dashed border-[#d2d2d7] rounded-2xl">
          <p className="text-[14px] text-[#6e6e73]">画像を取得できませんでした</p>
          <p className="text-[12px] text-[#86868b] mt-1">API 権限を確認するか、手動でアップロードしてください</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">

          {/* Android */}
          {androidData && (
            <div>
              <p className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-[#34a853] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24A11.37 11.37 0 0012 8a11.37 11.37 0 00-4.47.91L5.65 5.67a.634.634 0 00-.86-.2c-.29.16-.39.54-.22.83L6.4 9.48A10.78 10.78 0 001 19h22a10.78 10.78 0 00-5.4-9.52z"/></svg>
                </span>
                Google Play
              </p>
              <div className="space-y-4">
                {/* Feature Graphic */}
                {androidData.featureGraphic && (
                  <div>
                    <p className="text-[11px] text-[#86868b] mb-2">フィーチャーグラフィック</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={androidData.featureGraphic} alt="Feature Graphic"
                      className="w-full max-w-md h-auto rounded-xl border border-[#f0f0f0] shadow-sm"
                      loading="lazy" />
                  </div>
                )}
                {/* Screenshots */}
                {androidData.screenshots.length > 0 && (
                  <div>
                    <p className="text-[11px] text-[#86868b] mb-2">スクリーンショット</p>
                    <div className="grid grid-cols-4 gap-2 max-w-md">
                      {androidData.screenshots.map((url, i) => (
                        <ImageCard key={i} src={url} />
                      ))}
                      {Array.from({ length: Math.max(0, 4 - androidData.screenshots.length) }).map((_, i) => (
                        <EmptySlot key={`empty-${i}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* iOS */}
          {iosData && (
            <div>
              <p className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-[#1d1d1f] flex items-center justify-center text-white text-[8px] font-bold">A</span>
                App Store
              </p>
              {iosData.screenshots.length > 0 ? (
                <div>
                  <p className="text-[11px] text-[#86868b] mb-2">スクリーンショット (iPhone)</p>
                  <div className="grid grid-cols-4 gap-2 max-w-md">
                    {iosData.screenshots.map((url, i) => (
                      <ImageCard key={i} src={url} />
                    ))}
                    {Array.from({ length: Math.max(0, 4 - iosData.screenshots.length) }).map((_, i) => (
                      <EmptySlot key={`empty-${i}`} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center border border-dashed border-[#d2d2d7] rounded-xl">
                  <p className="text-[13px] text-[#86868b]">スクリーンショットを取得できませんでした</p>
                  <p className="text-[11px] text-[#c7c7cc] mt-1">App Manager キーの権限を確認してください</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
