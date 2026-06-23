"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// 최소한의 YouTube IFrame API 타입
interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: Record<string, unknown>,
  ) => YTPlayer;
  PlayerState: { PLAYING: number; ENDED: number; PAUSED: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const COMPLETE_RATIO = 0.9;
const SAMPLE_MS = 500; // 시청 초 집계 주기
const FLUSH_MS = 5000; // 서버 전송 주기

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT as YTNamespace);
    };
    document.body.appendChild(tag);
  });
  return apiPromise;
}

export default function YouTubePlayer({
  chapterId,
  youtubeId,
  initialPosition,
  initialWatchedSeconds,
  initialCompleted,
  nextHref,
}: {
  chapterId: string;
  youtubeId: string;
  initialPosition: number;
  initialWatchedSeconds: number;
  initialCompleted: boolean;
  nextHref: string | null;
}) {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  const watchedRef = useRef<Set<number>>(new Set());
  const lastPosRef = useRef<number>(initialPosition);
  const durationRef = useRef<number>(0);
  const dirtyRef = useRef<boolean>(false);
  const completedRef = useRef<boolean>(initialCompleted);

  const [watchedCount, setWatchedCount] = useState(initialWatchedSeconds);
  const [duration, setDuration] = useState(0);
  const [completed, setCompleted] = useState(initialCompleted);
  const [justCompleted, setJustCompleted] = useState(false);

  async function flush() {
    if (!dirtyRef.current || durationRef.current < 1) return;
    dirtyRef.current = false;
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: chapterId,
          watched_seconds: watchedRef.current.size,
          last_position: lastPosRef.current,
          duration: Math.round(durationRef.current),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.completed && !completedRef.current) {
        completedRef.current = true;
        setCompleted(true);
        if (data.newlyCompleted) setJustCompleted(true);
        router.refresh(); // 목록/잠금 상태 갱신
      }
    } catch {
      dirtyRef.current = true; // 실패 시 다음 주기에 재시도
    }
  }

  useEffect(() => {
    let sampleTimer: ReturnType<typeof setInterval>;
    let flushTimer: ReturnType<typeof setInterval>;
    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;

      playerRef.current = new YT.Player(mountRef.current, {
        videoId: youtubeId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          start: Math.max(0, initialPosition - 2),
        },
        events: {
          onReady: () => {
            const d = playerRef.current?.getDuration() ?? 0;
            durationRef.current = d;
            setDuration(d);
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
              flush();
            }
          },
        },
      });

      // 시청 초 집계 (재생 중일 때만 현재 초를 기록)
      sampleTimer = setInterval(() => {
        const p = playerRef.current;
        const YTns = window.YT;
        if (!p || !YTns) return;
        if (p.getPlayerState() !== YTns.PlayerState.PLAYING) return;

        const t = Math.floor(p.getCurrentTime());
        if (!watchedRef.current.has(t)) {
          watchedRef.current.add(t);
          setWatchedCount(watchedRef.current.size);
          dirtyRef.current = true;
        }
        lastPosRef.current = t;
        if (durationRef.current < 1) {
          const d = p.getDuration();
          if (d > 0) {
            durationRef.current = d;
            setDuration(d);
          }
        }
      }, SAMPLE_MS);

      flushTimer = setInterval(flush, FLUSH_MS);
    });

    return () => {
      cancelled = true;
      clearInterval(sampleTimer);
      clearInterval(flushTimer);
      flush();
      playerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, youtubeId]);

  const pct =
    duration > 0 ? Math.min(100, Math.round((watchedCount / duration) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl bg-black shadow-sm">
        <div className="aspect-video w-full">
          <div ref={mountRef} className="h-full w-full" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-black/70">
            시청 진도 {pct}%
            {completed && (
              <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                완료
              </span>
            )}
          </span>
          <span className="text-xs text-black/40">
            완료 기준 {Math.round(COMPLETE_RATIO * 100)}% 시청
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/8">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              completed ? "bg-emerald-500" : "bg-brand"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {justCompleted && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">
            이 강의를 완료했습니다. {nextHref ? "다음 강의가 열렸습니다." : "모든 강의를 마쳤습니다."}
          </p>
          {nextHref && (
            <a
              href={nextHref}
              className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              다음 강의 →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
