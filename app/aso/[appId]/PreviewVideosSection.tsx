"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

type PreviewVideo = {
  id: string;
  videoUrl: string | null;
  previewImage: string | null;
  previewType: string;
  mimeType: string | null;
};

function VideoCard({ video }: { video: PreviewVideo }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="border border-[#e5e5ea] rounded-2xl overflow-hidden">
      {/* Thumbnail / Player */}
      <div className="relative bg-[#1d1d1f] aspect-[9/16] flex items-center justify-center">
        {playing && video.videoUrl ? (
          <video
            src={video.videoUrl}
            autoPlay
            controls
            className="w-full h-full object-contain"
            onEnded={() => setPlaying(false)}
          />
        ) : video.previewImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={video.previewImage}
              alt="Preview thumbnail"
              className="w-full h-full object-cover"
            />
            {video.videoUrl && (
              <button
                onClick={() => setPlaying(true)}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center shadow-lg">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="#1d1d1f">
                    <path d="M6 4l12 6-12 6V4z" />
                  </svg>
                </div>
              </button>
            )}
          </>
        ) : (
          <div className="text-center">
            <p className="text-[13px] text-[#c7c7cc]">動画なし</p>
          </div>
        )}
      </div>
      <div className="px-3 py-2">
        <p className="text-[11px] text-[#86868b]">{video.previewType}</p>
      </div>
    </div>
  );
}

export function PreviewVideosSection({ appId, iosId }: { appId: string; iosId: string | null }) {
  const [videos, setVideos] = useState<PreviewVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function fetchPreviews() {
    if (!iosId) return;
    setLoading(true);
    const res = await fetch(`/api/aso/${appId}/previews`);
    if (res.ok) {
      const data = await res.json() as { previews: PreviewVideo[] };
      setVideos(data.previews);
      setLoaded(true);
    }
    setLoading(false);
  }

  if (!iosId) {
    return (
      <p className="text-[13px] text-[#86868b] py-4">iOS App ID が設定されていません</p>
    );
  }

  return (
    <div className="space-y-4">
      {!loaded ? (
        <div className="text-center py-8">
          <p className="text-[14px] text-[#6e6e73] mb-4">App Preview動画を確認します</p>
          <Button onClick={fetchPreviews} disabled={loading}>
            {loading ? "読み込み中..." : "プレビュー動画を取得"}
          </Button>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-[#d2d2d7] rounded-2xl">
          <p className="text-[20px] mb-2">🎬</p>
          <p className="text-[14px] font-medium text-[#1d1d1f]">App Preview動画が設定されていません</p>
          <p className="text-[13px] text-[#86868b] mt-1">
            App Preview動画はスクリーンショットと比べてCVRが高い傾向があります
          </p>
          <p className="text-[12px] text-[#86868b] mt-3">
            App Store Connect から動画をアップロードしてください
          </p>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-[#6e6e73]">{videos.length}本のApp Previewが設定済み</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {videos.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        </>
      )}
    </div>
  );
}
