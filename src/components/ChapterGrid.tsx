"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import NeuProgress from "@/components/NeuProgress";

export interface TileItem {
  id: string;
  position: number;
  title: string;
  description: string | null;
  thumbId: string | null; // 첫 클립의 YouTube ID (썸네일용)
  doneVideos: number;
  totalVideos: number;
  completed: boolean;
  unlocked: boolean;
  materialsOnly: boolean;
}

function statusOf(it: TileItem) {
  if (it.materialsOnly)
    return { label: "Materials", cls: "bg-slate-300/40 text-slate-500 ring-slate-400/30" };
  if (it.completed)
    return { label: "Done", cls: "bg-emerald-400/15 text-emerald-700 ring-emerald-400/30" };
  if (it.unlocked)
    return { label: "Open", cls: "bg-brand/10 text-brand ring-brand/20" };
  return { label: "Locked", cls: "bg-slate-400/10 text-slate-400 ring-slate-300/40" };
}

type Rect = { l: number; t: number; w: number; h: number };

export default function ChapterGrid({ items }: { items: TileItem[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null); // 호버한 카드의 그리드 내 위치/크기
  const [expanded, setExpanded] = useState(false); // 카드 → 그리드 전체로 늘어났는지
  const gridRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  function enter(i: number, el: HTMLElement) {
    const g = gridRef.current?.getBoundingClientRect();
    if (!g) return;
    const c = el.getBoundingClientRect();
    setRect({ l: c.left - g.left, t: c.top - g.top, w: c.width, h: c.height });
    setHovered(i);
    if (!expanded) {
      // 카드 크기에서 시작 → 다음 프레임에 그리드 전체로 늘림(width/height 트랜지션)
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() =>
        requestAnimationFrame(() => setExpanded(true)),
      );
    }
  }

  function leave() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setExpanded(false); // 마지막 카드 자리로 다시 줄어들며 사라짐
  }

  const item = hovered !== null ? items[hovered] : null;
  const status = item ? statusOf(item) : null;

  // 확장 패널 위치/크기: 펼치면 그리드 전체, 아니면 호버한 카드 자리
  const box: React.CSSProperties =
    expanded || !rect
      ? { left: 0, top: 0, width: "100%", height: "100%" }
      : { left: rect.l, top: rect.t, width: rect.w, height: rect.h };

  return (
    <div ref={gridRef} className="relative" onMouseLeave={leave}>
      {/* 원래 카드들 — 확장 시 빠르게 사라져 겹침(고스팅) 방지 */}
      <ul
        className="grid grid-cols-1 gap-4 transition-opacity duration-150 sm:grid-cols-2 lg:grid-cols-3"
        style={{ opacity: expanded ? 0 : 1, visibility: expanded ? "hidden" : "visible", transitionProperty: "opacity, visibility" }}
      >
        {items.map((it, i) => {
          const st = statusOf(it);
          const card = (
            <div
              onMouseEnter={(e) => enter(i, e.currentTarget)}
              className={`flex h-full min-h-[150px] flex-col rounded-2xl p-5 transition-shadow ${
                it.unlocked ? "neu-raised-sm" : "neu-flat"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  {it.position + 1}강
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${st.cls}`}
                >
                  {st.label}
                </span>
              </div>
              <h3
                className={`mt-3 line-clamp-2 font-semibold leading-snug ${
                  it.unlocked ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {it.title}
              </h3>
              <div className="mt-auto pt-3">
                {it.materialsOnly ? (
                  <p className="text-xs text-slate-400">강의 자료</p>
                ) : !it.unlocked ? (
                  <p className="text-xs text-slate-400">🔒 이전 강의 완료 시 열림</p>
                ) : it.totalVideos > 0 ? (
                  <>
                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                      <span>
                        Clip {it.doneVideos} / {it.totalVideos}
                      </span>
                      {it.completed && <span className="text-emerald-600">완료</span>}
                    </div>
                    <NeuProgress
                      percent={(it.doneVideos / it.totalVideos) * 100}
                      tone="gray"
                      className="h-1.5"
                    />
                  </>
                ) : null}
              </div>
            </div>
          );
          return (
            <li key={it.id}>
              {it.unlocked ? (
                <Link href={`/learn/${it.id}`} className="block h-full">
                  {card}
                </Link>
              ) : (
                <div aria-disabled className="h-full cursor-not-allowed">
                  {card}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* 호버한 카드 자리에서 width/height가 그리드 전체로 늘어나는 패널 */}
      {item && status && rect && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            ...box,
            opacity: expanded ? 1 : 0,
            // 박스(위치/크기)는 천천히 늘어나고, 불투명도는 빠르게 차서 원래 카드와 겹쳐 보이지 않게
            transition: expanded
              ? "left 320ms ease-out, top 320ms ease-out, width 320ms ease-out, height 320ms ease-out, opacity 120ms ease-out"
              : "left 260ms ease-in, top 260ms ease-in, width 260ms ease-in, height 260ms ease-in, opacity 200ms ease-in",
          }}
        >
          <div className="neu-raised flex h-full w-full gap-6 overflow-hidden rounded-2xl p-6">
            <div className="hidden aspect-video w-1/2 shrink-0 overflow-hidden rounded-xl bg-slate-800 sm:block">
              {item.thumbId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://img.youtube.com/vi/${item.thumbId}/hqdefault.jpg`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-6xl">
                  📄
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-brand">
                  {item.position + 1}강
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.cls}`}
                >
                  {status.label}
                </span>
              </div>
              <h3 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-slate-800">
                {item.title}
              </h3>
              <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-slate-500">
                {item.description ||
                  (item.materialsOnly
                    ? "강의 자료로 구성된 챕터입니다. 자료를 확인하세요."
                    : "강의를 시청하세요.")}
              </p>
              <div className="mt-auto pt-4">
                {item.totalVideos > 0 && (
                  <div className="mb-2 max-w-xs">
                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                      <span>
                        Clip {item.doneVideos} / {item.totalVideos} 완료
                      </span>
                    </div>
                    <NeuProgress
                      percent={(item.doneVideos / item.totalVideos) * 100}
                      tone="gray"
                      className="h-1.5"
                    />
                  </div>
                )}
                <span
                  className={`text-sm font-semibold ${
                    item.unlocked ? "text-brand" : "text-slate-400"
                  }`}
                >
                  {item.unlocked ? "수강하기 →" : "🔒 이전 강의 완료 시 열림"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
