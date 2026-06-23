"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Chapter } from "@/lib/db/types";
import {
  createChapter,
  updateChapter,
  deleteChapter,
  type ActionResult,
} from "@/app/admin/(dash)/chapters/actions";

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

  const input = "neu-input text-sm";

  return (
    <form
      onSubmit={onSubmit}
      className="neu-raised-sm space-y-3 rounded-2xl p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            제목
          </label>
          <input
            name="title"
            defaultValue={chapter?.title}
            placeholder="1강 — 항공 기상 개요"
            required
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            순서
          </label>
          <input
            name="position"
            type="number"
            min={0}
            defaultValue={chapter?.position ?? defaultPosition ?? 0}
            required
            className={input}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          YouTube 링크 또는 영상 ID
        </label>
        <input
          name="youtube_id"
          defaultValue={chapter?.youtube_id}
          placeholder="https://youtu.be/xxxxxxxxxxx 또는 영상 ID"
          required
          className={input}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          강의자료 링크 (선택)
        </label>
        <input
          name="material_url"
          defaultValue={chapter?.material_url ?? ""}
          placeholder="https://drive.google.com/..."
          className={input}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          설명 (선택)
        </label>
        <textarea
          name="description"
          defaultValue={chapter?.description ?? ""}
          rows={2}
          className={input}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          name="is_published"
          type="checkbox"
          defaultChecked={chapter?.is_published ?? false}
          className="h-4 w-4 accent-brand"
        />
        공개 (학생에게 노출)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="neu-btn-primary px-4 py-2 text-sm"
        >
          {pending ? "저장 중…" : chapter ? "수정 저장" : "강의 추가"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="neu-btn px-4 py-2 text-sm font-medium text-slate-600"
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}

export default function ChapterManager({
  chapters,
}: {
  chapters: Chapter[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startDelete] = useTransition();

  const refresh = () => router.refresh();
  const nextPosition =
    chapters.length > 0
      ? Math.max(...chapters.map((c) => c.position)) + 1
      : 0;

  function onDelete(c: Chapter) {
    if (!confirm(`"${c.title}" 강의를 삭제할까요? 학생들의 해당 진도 기록도 함께 삭제됩니다.`))
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
            + 새 강의
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
          아직 등록된 강의가 없습니다. "새 강의"로 추가하세요.
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
                        {c.is_published ? "공개" : "비공개"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      영상 ID: {c.youtube_id}
                      {c.material_url ? " · 자료 링크 있음" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setEditingId(c.id)}
                      className="neu-btn px-3 py-1.5 text-sm text-slate-600"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => onDelete(c)}
                      className="neu-btn px-3 py-1.5 text-sm text-red-500"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
