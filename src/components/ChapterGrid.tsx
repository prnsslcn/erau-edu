"use client";

import { useState } from "react";
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

export default function ChapterGrid({ items }: { items: TileItem[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered !== null ? items[hovered] : null;

  return (
    <div
      className="relative"
      onMouseLeave={() => setHovered(null)}
    >
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => {
          const status = statusOf(it);
          const card = (
            <div
              onMouseEnter={() => it.unlocked && setHovered(i)}
              className={`flex h-full min-h-[150px] flex-col rounded-2xl p-5 transition-shadow ${
                it.unlocked
                  ? "neu-raised-sm hover:shadow-[4px_4px_10px_#e5eaf1,-4px_-4px_10px_#ffffff,inset_2px_2px_6px_#e5eaf1,inset_-2px_-2px_6px_#ffffff]"
                  : "neu-flat"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  {it.position + 1}강
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.cls}`}
                >
                  {status.label}
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
                  <p className="text-xs text-slate-400">
                    🔒 이전 강의 완료 시 열림
                  </p>
                ) : it.totalVideos > 0 ? (
                  <>
                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                      <span>
                        Clip {it.doneVideos} / {it.totalVideos}
                      </span>
                      {it.completed && (
                        <span className="text-emerald-600">완료</span>
                      )}
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

      {/* hover 시 확장 오버레이 — 그리드를 꽉 채우며 썸네일 + 설명 */}
      <div
        className={`pointer-events-none absolute inset-0 z-20 transition-all duration-300 ease-out ${
          active
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0"
        }`}
      >
        {active && (
          <div className="neu-raised flex h-full w-full flex-col gap-5 rounded-2xl p-6 sm:flex-row">
            <div className="aspect-video overflow-hidden rounded-xl bg-slate-800 sm:h-full sm:w-3/5">
              {active.thumbId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://img.youtube.com/vi/${active.thumbId}/hqdefault.jpg`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl">
                  📄
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-brand">
                  {active.position + 1}강
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusOf(active).cls}`}
                >
                  {statusOf(active).label}
                </span>
              </div>
              <h3 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-slate-800">
                {active.title}
              </h3>
              <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-500">
                {active.description ||
                  (active.materialsOnly
                    ? "강의 자료로 구성된 챕터입니다. 자료를 확인하세요."
                    : "강의를 시청하세요.")}
              </p>
              <div className="mt-auto pt-4">
                {active.totalVideos > 0 && (
                  <div className="mb-2 max-w-xs">
                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                      <span>
                        Clip {active.doneVideos} / {active.totalVideos} 완료
                      </span>
                    </div>
                    <NeuProgress
                      percent={(active.doneVideos / active.totalVideos) * 100}
                      tone="gray"
                      className="h-1.5"
                    />
                  </div>
                )}
                <span className="text-sm font-semibold text-brand">
                  수강하기 →
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
