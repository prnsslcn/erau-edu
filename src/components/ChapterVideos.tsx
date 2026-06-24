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
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-base shadow-[4px_4px_10px_#e5eaf1,-4px_-4px_10px_#ffffff] transition-shadow ${
                i === active
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:shadow-[4px_4px_10px_#e5eaf1,-4px_-4px_10px_#ffffff,inset_2px_2px_5px_#dbe2ec,inset_-2px_-2px_5px_#ffffff]"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  v.completed
                    ? "bg-lime-500 text-white"
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
