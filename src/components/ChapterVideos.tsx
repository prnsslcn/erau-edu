"use client";

import { useState } from "react";
import YouTubePlayer from "@/components/YouTubePlayer";

export interface VideoItem {
  id: string;
  youtube_id: string;
  title: string | null;
  last_position: number;
  watched_seconds: number;
  completed: boolean;
}

// 챕터 내 여러 영상 — 선택 목록 + 단일 플레이어 (자유 시청)
export default function ChapterVideos({ videos }: { videos: VideoItem[] }) {
  // 첫 미완료 영상을 기본 선택
  const firstUndone = videos.findIndex((v) => !v.completed);
  const [active, setActive] = useState(firstUndone === -1 ? 0 : firstUndone);
  const current = videos[active];

  return (
    <div className="space-y-3">
      {videos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {videos.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setActive(i)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm ${
                i === active
                  ? "bg-blue-500 text-white"
                  : "bg-slate-200/60 text-slate-600"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                  v.completed
                    ? "bg-emerald-100 text-emerald-600"
                    : i === active
                      ? "bg-white/25 text-white"
                      : "bg-slate-300/70 text-slate-500"
                }`}
              >
                {v.completed ? "✓" : i + 1}
              </span>
              {v.title || `영상 ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {current && (
        <div>
          {videos.length > 1 && (
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              {current.title || `영상 ${active + 1}`}
            </h2>
          )}
          <YouTubePlayer
            key={current.id}
            videoId={current.id}
            youtubeId={current.youtube_id}
            initialPosition={current.last_position}
            initialWatchedSeconds={current.watched_seconds}
            initialCompleted={current.completed}
          />
        </div>
      )}
    </div>
  );
}
