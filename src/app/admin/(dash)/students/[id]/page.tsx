import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentDetail } from "@/lib/db/progress";
import NeuProgress from "@/components/NeuProgress";
import UnlockToggle from "@/components/admin/UnlockToggle";

export const dynamic = "force-dynamic";

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getStudentDetail(id);
  if (!detail) notFound();

  const { student, chapters } = detail;
  const completed = chapters.filter((c) => c.progress?.completed).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-brand hover:underline">
          ← 대시보드
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {student.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {student.phone} · 완료 {completed} / {chapters.length} 강의
        </p>
      </div>

      {chapters.length === 0 ? (
        <p className="neu-flat rounded-2xl p-8 text-center text-sm text-slate-400">
          등록된 강의가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {chapters.map((c) => {
            const p = c.progress;
            const dur = c.duration_seconds ?? 0;
            const pct =
              dur > 0 && p
                ? Math.min(100, Math.round((p.watched_seconds / dur) * 100))
                : 0;
            return (
              <li
                key={c.id}
                className="neu-raised-sm flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">
                      #{c.position}
                    </span>
                    <span className="truncate font-medium text-slate-700">
                      {c.title}
                    </span>
                    {!c.is_published && (
                      <span className="rounded-full bg-slate-400/10 px-2 py-0.5 text-[11px] text-slate-400">
                        Private
                      </span>
                    )}
                    {c.is_published && !c.unlocked && (
                      <span className="rounded-full bg-slate-400/10 px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-inset ring-slate-300/40">
                        🔒 Locked
                      </span>
                    )}
                    {c.is_published && c.overridden && !c.naturallyUnlocked && (
                      <span className="rounded-full bg-blue-400/15 px-2 py-0.5 text-[11px] font-medium text-brand ring-1 ring-inset ring-blue-400/30">
                        🔓 Unlocked
                      </span>
                    )}
                  </div>
                  {p && (
                    <>
                      <p className="mt-1 text-xs text-slate-400">
                        마지막 위치 {fmtTime(p.last_position)}
                        {dur > 0 ? ` · 시청 ${pct}%` : ""}
                      </p>
                      {dur > 0 && (
                        <div className="mt-2 max-w-xs">
                          <NeuProgress percent={pct} className="h-1.5" />
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      p?.completed
                        ? "bg-emerald-400/15 text-emerald-700 ring-1 ring-inset ring-emerald-400/30"
                        : p
                          ? "bg-amber-400/15 text-amber-700 ring-1 ring-inset ring-amber-400/30"
                          : "bg-slate-400/10 text-slate-400 ring-1 ring-inset ring-slate-300/40"
                    }`}
                  >
                    {p?.completed ? "Done" : p ? "In progress" : "Not started"}
                  </span>
                  {c.is_published && !c.unlocked && (
                    <UnlockToggle
                      studentId={student.id}
                      chapterId={c.id}
                      mode="unlock"
                    />
                  )}
                  {c.is_published && c.overridden && !c.naturallyUnlocked && (
                    <UnlockToggle
                      studentId={student.id}
                      chapterId={c.id}
                      mode="revert"
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
