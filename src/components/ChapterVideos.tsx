"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import YouTubePlayer from "@/components/YouTubePlayer";
import NeuProgress from "@/components/NeuProgress";

export interface VideoItem {
  id: string;
  youtube_id: string;
  title: string | null;
  last_position: number;
  watched_seconds: number;
  completed: boolean;
}

// 챕터 내 여러 영상 — 진도 + 토글식 선택 목록 + 단일 플레이어 (자유 시청)
export default function ChapterVideos({ videos }: { videos: VideoItem[] }) {
  const firstUndone = videos.findIndex((v) => !v.completed);
  const [active, setActive] = useState(firstUndone === -1 ? 0 : firstUndone);
  const multi = videos.length > 1;
  // 영상이 많으면(>8) 기본 접힘
  const [open, setOpen] = useState(videos.length <= 8);

  const current = videos[active];
  const done = videos.filter((v) => v.completed).length;

  return (
    <div className="space-y-3">
      {/* 진도 영역 + 영상 목록 토글 (한 줄) */}
      <div className="flex items-end justify-between gap-4">
        <div className="w-full max-w-xs">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
            <span>
              영상 {done} / {videos.length} 완료
            </span>
            <span>자유 시청</span>
          </div>
          <NeuProgress
            percent={(done / videos.length) * 100}
            tone="green"
            className="h-2"
          />
        </div>

        {multi && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="neu-btn flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm text-slate-600"
          >
            영상 목록 ({videos.length})
            <ChevronDown
              size={15}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* 토글 펼침 시 칩 목록 */}
      {multi && open && (
        <div className="flex flex-wrap gap-2">
          {videos.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setActive(i)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm shadow-[4px_4px_10px_#e5eaf1,-4px_-4px_10px_#ffffff] transition-shadow ${
                i === active
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:shadow-[4px_4px_10px_#e5eaf1,-4px_-4px_10px_#ffffff,inset_2px_2px_5px_#dbe2ec,inset_-2px_-2px_5px_#ffffff]"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
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

      {/* 활성 영상 플레이어 */}
      {current && (
        <div>
          {multi && (
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
