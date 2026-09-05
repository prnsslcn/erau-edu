"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NeuProgress from "@/components/NeuProgress";

// 교수가 직접 업로드한 영상(Bunny Stream) 플레이어.
//
// 진도 계산은 YouTubePlayer 와 완전히 동일하다 —
// 재생 중 흘러간 '초'만 Set 에 모으고(건너뛴 구간은 미집계), 5초마다 /api/progress 로 보낸다.
// 다른 점은 재생 시간을 얻는 경로뿐이다: YouTube IFrame API → player.js(timeupdate).

interface PlayerJs {
  on(event: "ready" | "play" | "pause" | "ended", cb: () => void): void;
  on(
    event: "timeupdate",
    cb: (d: { seconds: number; duration: number }) => void,
  ): void;
  setCurrentTime(seconds: number): void;
}
declare global {
  interface Window {
    playerjs?: { Player: new (el: HTMLIFrameElement) => PlayerJs };
  }
}

const COMPLETE_RATIO = 0.9;
const FLUSH_MS = 5000;
// 이전 세션에서 이미 본 시간을 Set 에 미리 채운다.
// 어느 '초'를 봤는지는 저장하지 않고 총량만 저장하므로, 순차 시청을 전제로 0..N-1 로 채운다.
// 이게 없으면 재생을 시작하는 순간 집계가 0부터 다시 시작해
//   (1) 화면 진도율이 뚝 떨어지고
//   (2) 여러 번에 나눠 본 학생의 진도가 영원히 누적되지 않는다(서버가 max 로 유지하므로).
function seedWatched(seconds: number): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < Math.max(0, seconds); i++) s.add(i);
  return s;
}

const PLAYERJS_SRC =
  "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";

let apiPromise: Promise<void> | null = null;
function loadPlayerJs(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (window.playerjs) return resolve();
    const tag = document.createElement("script");
    tag.src = PLAYERJS_SRC;
    tag.onload = () => resolve();
    tag.onerror = () => reject(new Error("플레이어를 불러오지 못했습니다."));
    document.body.appendChild(tag);
  });
  return apiPromise;
}

export default function BunnyPlayer({
  videoId,
  embedUrl,
  initialPosition,
  initialWatchedSeconds,
  initialCompleted,
  initialDuration,
  label,
}: {
  videoId: string;
  embedUrl: string;
  initialPosition: number;
  initialWatchedSeconds: number;
  initialCompleted: boolean;
  initialDuration: number;
  label?: string;
}) {
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);

  const watchedRef = useRef<Set<number>>(seedWatched(initialWatchedSeconds));
  const lastPosRef = useRef<number>(initialPosition);
  const durationRef = useRef<number>(initialDuration);
  const dirtyRef = useRef<boolean>(false);
  const completedRef = useRef<boolean>(initialCompleted);
  const resumedRef = useRef<boolean>(false);

  const [watchedCount, setWatchedCount] = useState(initialWatchedSeconds);
  const [duration, setDuration] = useState(initialDuration);
  const [completed, setCompleted] = useState(initialCompleted);
  const [error, setError] = useState<string | null>(null);

  async function flush() {
    if (!dirtyRef.current || durationRef.current < 1) return;
    dirtyRef.current = false;
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          watched_seconds: watchedRef.current.size,
          last_position: lastPosRef.current,
          duration: Math.round(durationRef.current),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.completed && !completedRef.current) {
        completedRef.current = true;
        setCompleted(true);
        router.refresh(); // 챕터 완료/잠금 상태 갱신
      }
    } catch {
      dirtyRef.current = true;
    }
  }

  useEffect(() => {
    let flushTimer: ReturnType<typeof setInterval>;
    let cancelled = false;

    loadPlayerJs()
      .then(() => {
        if (cancelled || !frameRef.current || !window.playerjs) return;
        const player = new window.playerjs.Player(frameRef.current);

        // 이어보기 — 2초 앞에서 시작.
        // ready 에서 한 번 시도하되 성공 여부를 단정하지 않는다. 스크립트가 늦게 로드되면
        // ready 를 놓칠 수 있고, 메타데이터 로드 전이면 seek 이 무시되기 때문이다.
        // 실제 보장은 아래 timeupdate 폴백이 한다.
        player.on("ready", () => {
          if (initialPosition > 2) player.setCurrentTime(initialPosition - 2);
        });

        // 재생 중에만 발생 → 건너뛴 구간은 자연히 집계에서 빠진다
        player.on("timeupdate", ({ seconds, duration: d }) => {
          if (d > 0 && durationRef.current !== d) {
            durationRef.current = d;
            setDuration(d);
          }

          // 첫 timeupdate 시점엔 미디어가 확실히 준비돼 있다.
          // 처음부터 재생되고 있을 때(seconds<=2)만 되감아, 학생이 직접 앞으로
          // 옮겨놓은 위치를 빼앗지 않는다.
          if (!resumedRef.current) {
            resumedRef.current = true;
            if (initialPosition > 2 && seconds <= 2) {
              player.setCurrentTime(initialPosition - 2);
              return;
            }
          }
          const t = Math.floor(seconds);
          if (!watchedRef.current.has(t)) {
            watchedRef.current.add(t);
            setWatchedCount(watchedRef.current.size);
            dirtyRef.current = true;
          }
          lastPosRef.current = t;
        });

        player.on("pause", flush);
        player.on("ended", flush);

        flushTimer = setInterval(flush, FLUSH_MS);
      })
      .catch((e) => setError(e.message));

    return () => {
      cancelled = true;
      clearInterval(flushTimer);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, embedUrl]);

  const pct =
    duration > 0 ? Math.min(100, Math.round((watchedCount / duration) * 100)) : 0;

  return (
    <div className="neu-raised space-y-3 rounded-2xl p-3">
      <div className="relative">
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            ref={frameRef}
            src={embedUrl}
            loading="lazy"
            allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              completed ? "bg-emerald-400" : "bg-sky-400"
            }`}
          />
          시청 {pct}%
          {completed && <span className="text-emerald-300">· Done</span>}
        </div>
      </div>

      <div className="px-1 pb-1">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-baseline gap-2">
            {label && (
              <span className="text-lg font-bold text-slate-800">{label}</span>
            )}
            <span className="font-semibold text-slate-700">
              시청 진도 {pct}%
            </span>
            {completed && (
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-400/30">
                Done
              </span>
            )}
          </span>
          <span className="shrink-0 text-xs text-slate-400">
            완료 기준 {Math.round(COMPLETE_RATIO * 100)}% 시청
          </span>
        </div>
        <div className="mt-3">
          <NeuProgress percent={pct} className="h-2.5" />
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
