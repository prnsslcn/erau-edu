import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentDetail } from "@/lib/db/progress";
import NeuProgress from "@/components/NeuProgress";
import UnlockToggle from "@/components/admin/UnlockToggle";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getStudentDetail(id);
  if (!detail) notFound();

  const { student, chapters } = detail;
  const completed = chapters.filter((c) => c.is_published && c.completed).length;
  const publishedCount = chapters.filter(
    (c) => c.is_published && !c.materialsOnly,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-brand hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {student.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {student.phone} · {completed} / {publishedCount} chapters done
        </p>
      </div>

      {chapters.length === 0 ? (
        <p className="neu-flat rounded-2xl p-8 text-center text-sm text-slate-400">
          등록된 챕터가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {chapters.map((c) => {
            const anyStarted = c.videos.some(
              (v) => v.completed || v.watchedSeconds > 0,
            );
            const status = c.materialsOnly
              ? { label: "Materials", cls: "bg-blue-400/10 text-brand ring-blue-400/30" }
              : c.completed
                ? { label: "Done", cls: "bg-emerald-400/15 text-emerald-700 ring-emerald-400/30" }
                : anyStarted
                  ? { label: "In progress", cls: "bg-amber-400/15 text-amber-700 ring-amber-400/30" }
                  : { label: "Not started", cls: "bg-slate-400/10 text-slate-400 ring-slate-300/40" };

            return (
              <li key={c.id} className="neu-raised-sm rounded-2xl px-4 py-3.5">
                <div className="flex items-start justify-between gap-4">
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

                    {/* 영상별 진도 */}
                    {c.videos.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {c.videos.map((v, i) => (
                          <li
                            key={v.video.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                                v.completed
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-slate-200 text-slate-400"
                              }`}
                            >
                              {v.completed ? "✓" : i + 1}
                            </span>
                            <span className="w-32 shrink-0 truncate text-slate-500">
                              {v.video.title || `영상 ${i + 1}`}
                            </span>
                            <div className="max-w-[10rem] flex-1">
                              <NeuProgress percent={v.pct} className="h-1.5" />
                            </div>
                            <span className="shrink-0 tabular-nums text-slate-400">
                              {v.pct}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.cls}`}
                    >
                      {status.label}
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
