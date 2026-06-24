"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import NeuProgress from "@/components/NeuProgress";
import UnlockToggle from "@/components/admin/UnlockToggle";

interface DetailVideo {
  video: { id: string; title: string | null };
  watchedSeconds: number;
  pct: number;
  completed: boolean;
}
export interface DetailChapter {
  id: string;
  position: number;
  title: string;
  is_published: boolean;
  materialsOnly: boolean;
  unlocked: boolean;
  overridden: boolean;
  naturallyUnlocked: boolean;
  completed: boolean;
  videos: DetailVideo[];
}

function statusOf(c: DetailChapter) {
  const anyStarted = c.videos.some((v) => v.completed || v.watchedSeconds > 0);
  if (c.materialsOnly)
    return { label: "Materials", cls: "bg-slate-300/40 text-slate-500 ring-slate-400/30" };
  if (c.completed)
    return { label: "Done", cls: "bg-emerald-400/15 text-emerald-700 ring-emerald-400/30" };
  if (anyStarted)
    return { label: "In progress", cls: "bg-amber-400/15 text-amber-700 ring-amber-400/30" };
  return { label: "Not started", cls: "bg-slate-400/10 text-slate-400 ring-slate-300/40" };
}

function ChapterRow({
  studentId,
  c,
}: {
  studentId: string;
  c: DetailChapter;
}) {
  const [open, setOpen] = useState(false);
  const status = statusOf(c);
  const showUnlock = c.is_published && !c.unlocked;
  const showRevert = c.is_published && c.overridden && !c.naturallyUnlocked;
  const doneCount = c.videos.filter((v) => v.completed).length;

  return (
    <li className="neu-raised-sm overflow-hidden rounded-2xl">
      {/* 헤더 (클릭 시 펼침/접힘) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <ChevronDown
            size={16}
            className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
          <span className="text-xs font-semibold text-slate-400">
            #{c.position}
          </span>
          <span className="truncate font-medium text-slate-700">{c.title}</span>
          {!c.is_published && (
            <span className="shrink-0 rounded-full bg-slate-400/10 px-2 py-0.5 text-[11px] text-slate-400">
              Private
            </span>
          )}
          {showUnlock && (
            <span className="shrink-0 rounded-full bg-slate-400/10 px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-inset ring-slate-300/40">
              🔒 Locked
            </span>
          )}
          {showRevert && (
            <span className="shrink-0 rounded-full bg-blue-400/15 px-2 py-0.5 text-[11px] font-medium text-brand ring-1 ring-inset ring-blue-400/30">
              🔓 Unlocked
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {!c.materialsOnly && c.videos.length > 0 && (
            <span className="text-xs tabular-nums text-slate-400">
              {doneCount}/{c.videos.length}
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.cls}`}
          >
            {status.label}
          </span>
        </div>
      </button>

      {/* 블라인드 펼침 영역 */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-slate-200 px-4 py-3.5">
            {c.videos.length > 0 ? (
              <ul className="space-y-1.5">
                {c.videos.map((v, i) => (
                  <li key={v.video.id} className="flex items-center gap-2 text-xs">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                        v.completed
                          ? "bg-slate-500 text-white"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {v.completed ? "✓" : i + 1}
                    </span>
                    <span className="w-32 shrink-0 truncate text-slate-500">
                      {v.video.title || `Clip ${i + 1}`}
                    </span>
                    <div className="max-w-[12rem] flex-1">
                      <NeuProgress percent={v.pct} className="h-1.5" />
                    </div>
                    <span className="shrink-0 tabular-nums text-slate-400">
                      {v.pct}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                {c.materialsOnly
                  ? "강의 자료로 구성된 챕터입니다."
                  : "등록된 클립이 없습니다."}
              </p>
            )}

            {(showUnlock || showRevert) && (
              <div className="flex justify-end">
                <UnlockToggle
                  studentId={studentId}
                  chapterId={c.id}
                  mode={showUnlock ? "unlock" : "revert"}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export default function StudentChapters({
  studentId,
  chapters,
}: {
  studentId: string;
  chapters: DetailChapter[];
}) {
  return (
    <ul className="space-y-2.5">
      {chapters.map((c) => (
        <ChapterRow key={c.id} studentId={studentId} c={c} />
      ))}
    </ul>
  );
}
