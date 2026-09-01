"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Chapter, Material, Video } from "@/lib/db/types";
import NeuProgress from "@/components/NeuProgress";
import { putToSignedUrl } from "@/lib/upload";
import {
  createChapter,
  updateChapter,
  deleteChapter,
  addVideo,
  deleteVideo,
  moveVideo,
  moveMaterial,
  createMaterialUploadTicket,
  finalizeMaterial,
  deleteMaterial,
  type ActionResult,
} from "@/app/admin/(dash)/chapters/actions";

// 자료 1개 업로드: 티켓 발급 → 브라우저가 Storage로 직접 PUT → 서버에서 확정.
// 파일 바이트가 서버 함수를 거치지 않으므로 본문 상한(1MB/4.5MB)에 걸리지 않는다.
async function uploadMaterialFile(
  chapterId: string,
  file: File,
  title: string,
  onProgress?: (percent: number) => void,
): Promise<ActionResult> {
  const ticket = await createMaterialUploadTicket(
    chapterId,
    file.name,
    file.size,
  );
  if (!ticket.ok || !ticket.url || !ticket.path)
    return { ok: false, error: ticket.error ?? "업로드 준비에 실패했습니다." };

  try {
    await putToSignedUrl(ticket.url, file, onProgress);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "업로드에 실패했습니다.",
    };
  }

  // 제목 미입력 시 원본 파일명을 쓴다.
  // (Storage 경로는 [^\w.\-] 를 _ 로 바꾸므로 한글 파일명이 뭉개진다 → 표시용 제목은 원본 유지)
  return finalizeMaterial(chapterId, ticket.path, title.trim() || file.name);
}

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
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<{
    name: string;
    percent: number;
    index: number;
    total: number;
  } | null>(null);
  // 생성 폼에서 직접 추가하는 클립/자료 입력 행
  const clipSeq = useRef(1);
  const matSeq = useRef(1);
  const [clipRows, setClipRows] = useState<number[]>([0]);
  const [matRows, setMatRows] = useState<number[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    // 수정 모드 — 파일 입력이 없으므로 그대로 전송
    if (chapter) {
      start(async () => {
        const res: ActionResult = await updateChapter(chapter.id, fd);
        if (res.ok) onDone();
        else setError(res.error ?? "오류가 발생했습니다.");
      });
      return;
    }

    // 생성 모드 — 자료 파일은 서버 액션에 싣지 않는다(본문 상한).
    // 챕터를 먼저 만들고, 그 id로 브라우저가 Storage에 직접 올린다.
    const rawFiles = fd.getAll("material_file");
    const rawTitles = fd.getAll("material_title").map((v) => String(v));
    const picked: { file: File; title: string }[] = [];
    rawFiles.forEach((f, i) => {
      if (f instanceof File && f.size > 0)
        picked.push({ file: f, title: rawTitles[i] ?? "" });
    });
    fd.delete("material_file");
    fd.delete("material_title");

    setBusy(true);
    const res = await createChapter(fd);
    if (!res.ok || !res.id) {
      setBusy(false);
      setError(res.error ?? "오류가 발생했습니다.");
      return;
    }

    for (let i = 0; i < picked.length; i++) {
      const { file, title } = picked[i];
      setUploading({ name: file.name, percent: 0, index: i + 1, total: picked.length });
      const r = await uploadMaterialFile(res.id, file, title, (percent) =>
        setUploading({ name: file.name, percent, index: i + 1, total: picked.length }),
      );
      if (!r.ok) {
        setBusy(false);
        setUploading(null);
        // 챕터는 이미 생성된 상태 — 나머지는 Content 화면에서 이어서 올리면 된다
        setError(
          `챕터는 생성됐지만 "${file.name}" 업로드에 실패했습니다 (${r.error}). Content 화면에서 다시 올려주세요.`,
        );
        return;
      }
    }

    setUploading(null);
    setBusy(false);
    onDone();
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

      {uploading && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span className="truncate">
              자료 업로드 {uploading.index}/{uploading.total} · {uploading.name}
            </span>
            <span className="shrink-0 tabular-nums">
              {uploading.percent < 100 ? `${uploading.percent}%` : "저장 중…"}
            </span>
          </div>
          <NeuProgress percent={uploading.percent} className="h-1.5" />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || busy}
          className="neu-btn-primary px-4 py-2 text-sm"
        >
          {pending || busy ? "Saving…" : chapter ? "Save" : "Add"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
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
  const [uploading, setUploading] = useState(false);
  const [percent, setPercent] = useState(0);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("파일을 선택하세요.");
      return;
    }

    setUploading(true);
    setPercent(0);
    const res = await uploadMaterialFile(
      chapterId,
      file,
      String(fd.get("title") ?? ""),
      setPercent,
    );
    setUploading(false);

    if (res.ok) {
      form.reset();
      refresh();
    } else setError(res.error ?? "오류");
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
          disabled={pending || uploading}
          className="neu-btn px-3 py-2 text-sm"
        >
          {/* 100% 이후에도 서버 확정(finalize)이 남아 있어 멈춘 것처럼 보이므로 상태를 구분한다 */}
          {uploading
            ? percent < 100
              ? `업로드 ${percent}%`
              : "저장 중…"
            : "+ 업로드"}
        </button>
      </form>
      {uploading && <NeuProgress percent={percent} className="h-1.5" />}
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
