"use client";

import { useRef, useState } from "react";
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

// 챕터 내 여러 Clip — 진도 + 토글식 선택 목록 + 단일 플레이어 (자유 시청)
export default function ChapterVideos({ videos }: { videos: VideoItem[] }) {
  const firstUndone = videos.findIndex((v) => !v.completed);
  const [active, setActive] = useState(firstUndone === -1 ? 0 : firstUndone);
  const multi = videos.length > 1;
  // Clip이 많으면(>8) 기본 접힘
  const [open, setOpen] = useState(videos.length <= 8);
  const chipsRef = useRef<HTMLDivElement>(null);

  const current = videos[active];
  const done = videos.filter((v) => v.completed).length;

  return (
    <div className="space-y-3">
      {/* 진도 영역 + Clip 목록 토글 — 하나의 기다란 뉴모피즘 바 */}
      <div className="neu-raised flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5">
        <div className="w-full max-w-xs">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
            <span>
              Clip {done} / {videos.length} 완료
            </span>
            <span>자유 시청</span>
          </div>
          <NeuProgress
            percent={(done / videos.length) * 100}
            tone="gray"
            className="h-2"
          />
        </div>

        {multi && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Clip 목록 ({videos.length})
            <ChevronDown
              size={15}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* 토글 펼침 시 칩 목록 — 블라인드(부드러운 max-height) */}
      {multi && (
        <div
          className="overflow-hidden transition-[max-height] duration-500 ease-out"
          style={{ maxHeight: open ? (chipsRef.current?.scrollHeight ?? 1000) : 0 }}
        >
          <div ref={chipsRef} className="flex flex-wrap gap-2 pb-1">
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
                      ? "bg-slate-500 text-white"
                      : i === active
                        ? "bg-white/25 text-white"
                        : "bg-slate-300/70 text-slate-500"
                  }`}
                >
                  {v.completed ? "✓" : i + 1}
                </span>
                {v.title || `Clip ${i + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 활성 Clip 플레이어 */}
      {current && (
        <YouTubePlayer
          key={current.id}
          videoId={current.id}
          youtubeId={current.youtube_id}
          initialPosition={current.last_position}
          initialWatchedSeconds={current.watched_seconds}
          initialCompleted={current.completed}
          label={multi ? current.title || `Clip ${active + 1}` : undefined}
        />
      )}
    </div>
  );
}
