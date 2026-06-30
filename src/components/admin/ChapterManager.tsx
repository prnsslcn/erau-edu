"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Chapter, Material, Video } from "@/lib/db/types";
import {
  createChapter,
  updateChapter,
  deleteChapter,
  addVideo,
  deleteVideo,
  moveVideo,
  moveMaterial,
  uploadMaterial,
  deleteMaterial,
  type ActionResult,
} from "@/app/admin/(dash)/chapters/actions";

const moveBtnCls =
  "shrink-0 rounded-md px-1.5 text-slate-400 transition-colors hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400";

export interface ChapterWithContent extends Chapter {
  videos: Video[];
  materials: Material[];
}

const inputCls = "neu-input text-sm";

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
}

// ─────────────── 챕터 폼 ───────────────
function ChapterForm({
  chapter,
  defaultPosition,
  onDone,
  onCancel,
}: {
  chapter?: Chapter;
  defaultPosition?: number;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // 생성 폼에서 직접 추가하는 클립/자료 입력 행
  const clipSeq = useRef(1);
  const matSeq = useRef(1);
  const [clipRows, setClipRows] = useState<number[]>([0]);
  const [matRows, setMatRows] = useState<number[]>([]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res: ActionResult = chapter
        ? await updateChapter(chapter.id, fd)
        : await createChapter(fd);
      if (res.ok) onDone();
      else setError(res.error ?? "오류가 발생했습니다.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="neu-raised-sm space-y-3 rounded-2xl p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Title
          </label>
          <input
            name="title"
            defaultValue={chapter?.title}
            placeholder="비행 원리"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Order
          </label>
          <input
            name="position"
            type="number"
            min={0}
            defaultValue={chapter?.position ?? defaultPosition ?? 0}
            required
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          설명 (선택)
        </label>
        <textarea
          name="description"
          defaultValue={chapter?.description ?? ""}
          rows={2}
          className={inputCls}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          name="is_published"
          type="checkbox"
          defaultChecked={chapter?.is_published ?? false}
          className="h-4 w-4 accent-blue-500"
        />
        Public (학생에게 노출)
      </label>

      {/* 생성 시 클립/자료 직접 추가 */}
      {!chapter && (
        <div className="space-y-4 border-t border-slate-200 pt-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              클립 (YouTube)
            </p>
            {clipRows.map((id) => (
              <div key={id} className="flex items-center gap-2">
                <input
                  name="clip_youtube"
                  placeholder="YouTube 링크 또는 ID"
                  className={`${inputCls} min-w-0 flex-1`}
                />
                <input
                  name="clip_title"
                  placeholder="제목(선택)"
                  className={`${inputCls} w-32`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setClipRows((r) => r.filter((x) => x !== id))
                  }
                  className="shrink-0 px-1.5 text-sm text-red-500"
                  aria-label="클립 행 삭제"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setClipRows((r) => [...r, clipSeq.current++])}
              className="neu-btn px-3 py-1.5 text-xs"
            >
              + 클립 추가
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">자료 PDF</p>
            {matRows.map((id) => (
              <div key={id} className="flex items-center gap-2">
                <input
                  name="material_file"
                  type="file"
                  accept="application/pdf"
                  className="min-w-0 flex-1 text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-200 file:px-2 file:py-1 file:text-xs file:text-slate-600"
                />
                <input
                  name="material_title"
                  placeholder="자료명(선택)"
                  className={`${inputCls} w-32`}
                />
                <button
                  type="button"
                  onClick={() => setMatRows((r) => r.filter((x) => x !== id))}
                  className="shrink-0 px-1.5 text-sm text-red-500"
                  aria-label="자료 행 삭제"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMatRows((r) => [...r, matSeq.current++])}
              className="neu-btn px-3 py-1.5 text-xs"
            >
              + 자료 추가
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="neu-btn-primary px-4 py-2 text-sm"
        >
          {pending ? "Saving…" : chapter ? "Save" : "Add"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="neu-btn px-4 py-2 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ─────────────── Clip 관리 ───────────────
function VideoSection({
  chapterId,
  videos,
  refresh,
}: {
  chapterId: string;
  videos: Video[];
  refresh: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const res = await addVideo(chapterId, fd);
      if (res.ok) {
        form.reset();
        refresh();
      } else setError(res.error ?? "오류");
    });
  }

  function onDelete(id: string) {
    start(async () => {
      await deleteVideo(id);
      refresh();
    });
  }

  function onMove(id: string, dir: "up" | "down") {
    start(async () => {
      await moveVideo(id, dir);
      refresh();
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500">
        Clip ({videos.length})
      </p>
      {videos.length > 0 && (
        <ul className="space-y-1.5">
          {videos.map((v, i) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-200/40 px-3 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate text-slate-600">
                <span className="text-slate-400">{i + 1}.</span>{" "}
                {v.title || v.youtube_id}
                <span className="ml-1 text-xs text-slate-400">
                  ({v.youtube_id})
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => onMove(v.id, "up")}
                  disabled={pending || i === 0}
                  className={moveBtnCls}
                  aria-label="위로"
                >
                  ↑
                </button>
                <button
                  onClick={() => onMove(v.id, "down")}
                  disabled={pending || i === videos.length - 1}
                  className={moveBtnCls}
                  aria-label="아래로"
                >
                  ↓
                </button>
                <button
                  onClick={() => onDelete(v.id)}
                  disabled={pending}
                  className="ml-1 text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  삭제
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onAdd} className="flex flex-wrap items-center gap-2">
        <input
          name="youtube_id"
          placeholder="YouTube 링크 또는 ID"
          required
          className={`${inputCls} min-w-0 flex-1`}
        />
        <input
          name="title"
          placeholder="Clip 제목 (선택)"
          className={`${inputCls} w-40`}
        />
        <button
          type="submit"
          disabled={pending}
          className="neu-btn px-3 py-2 text-sm"
        >
          + Clip
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─────────────── 자료(PDF) 관리 ───────────────
function MaterialSection({
  chapterId,
  materials,
  refresh,
}: {
  chapterId: string;
  materials: Material[];
  refresh: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const res = await uploadMaterial(chapterId, fd);
      if (res.ok) {
        form.reset();
        refresh();
      } else setError(res.error ?? "오류");
    });
  }

  function onDelete(id: string) {
    start(async () => {
      await deleteMaterial(id);
      refresh();
    });
  }

  function onMove(id: string, dir: "up" | "down") {
    start(async () => {
      await moveMaterial(id, dir);
      refresh();
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500">
        자료 PDF ({materials.length})
      </p>
      {materials.length > 0 && (
        <ul className="space-y-1.5">
          {materials.map((m, i) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-200/40 px-3 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate text-slate-600">
                📄 {m.title}
                <span className="ml-1 text-xs text-slate-400">
                  {fmtSize(m.size_bytes)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => onMove(m.id, "up")}
                  disabled={pending || i === 0}
                  className={moveBtnCls}
                  aria-label="위로"
                >
                  ↑
                </button>
                <button
                  onClick={() => onMove(m.id, "down")}
                  disabled={pending || i === materials.length - 1}
                  className={moveBtnCls}
                  aria-label="아래로"
                >
                  ↓
                </button>
                <button
                  onClick={() => onDelete(m.id)}
                  disabled={pending}
                  className="ml-1 text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  삭제
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onUpload} className="flex flex-wrap items-center gap-2">
        <input
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="min-w-0 flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:text-slate-600"
        />
        <input
          name="title"
          placeholder="자료명 (선택)"
          className={`${inputCls} w-40`}
        />
        <button
          type="submit"
          disabled={pending}
          className="neu-btn px-3 py-2 text-sm"
        >
          {pending ? "업로드…" : "+ 업로드"}
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─────────────── 메인 ───────────────
export default function ChapterManager({
  chapters,
}: {
  chapters: ChapterWithContent[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startDelete] = useTransition();

  const refresh = () => router.refresh();
  const nextPosition =
    chapters.length > 0
      ? Math.max(...chapters.map((c) => c.position)) + 1
      : 0;

  function onDelete(c: Chapter) {
    if (
      !confirm(
        `"${c.title}" 챕터를 삭제할까요? Clip·자료·학생 진도 기록이 함께 삭제됩니다.`,
      )
    )
      return;
    startDelete(async () => {
      await deleteChapter(c.id);
      refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">강의 관리</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="neu-btn-primary px-4 py-2 text-sm"
          >
            + New
          </button>
        )}
      </div>

      {creating && (
        <ChapterForm
          defaultPosition={nextPosition}
          onDone={() => {
            setCreating(false);
            refresh();
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {chapters.length === 0 && !creating ? (
        <p className="neu-flat rounded-2xl p-8 text-center text-sm text-slate-400">
          아직 등록된 챕터가 없습니다. "New"로 추가하세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {chapters.map((c) => (
            <li key={c.id} className="neu-raised-sm rounded-2xl p-4">
              {editingId === c.id ? (
                <ChapterForm
                  chapter={c}
                  onDone={() => {
                    setEditingId(null);
                    refresh();
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">
                          #{c.position}
                        </span>
                        <span className="font-semibold text-slate-700">
                          {c.title}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            c.is_published
                              ? "bg-emerald-400/15 text-emerald-700 ring-1 ring-inset ring-emerald-400/30"
                              : "bg-slate-400/10 text-slate-400 ring-1 ring-inset ring-slate-300/40"
                          }`}
                        >
                          {c.is_published ? "Public" : "Private"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Clip {c.videos.length}개 · 자료 {c.materials.length}개
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() =>
                          setManagingId(managingId === c.id ? null : c.id)
                        }
                        className="neu-btn px-3 py-1.5 text-sm text-slate-600"
                      >
                        {managingId === c.id ? "Close" : "Content"}
                      </button>
                      <button
                        onClick={() => setEditingId(c.id)}
                        className="neu-btn px-3 py-1.5 text-sm text-slate-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(c)}
                        className="neu-btn px-3 py-1.5 text-sm text-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {managingId === c.id && (
                    <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                      <VideoSection
                        chapterId={c.id}
                        videos={c.videos}
                        refresh={refresh}
                      />
                      <MaterialSection
                        chapterId={c.id}
                        materials={c.materials}
                        refresh={refresh}
                      />
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
