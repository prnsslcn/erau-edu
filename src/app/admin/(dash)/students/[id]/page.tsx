import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentDetail } from "@/lib/db/progress";

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
        <p className="mt-1 text-sm text-black/55">
          {student.phone} · 완료 {completed} / {chapters.length} 강의
        </p>
      </div>

      {chapters.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-black/45">
          등록된 강의가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
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
                className="flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-black/40">
                      #{c.position}
                    </span>
                    <span className="truncate font-medium">{c.title}</span>
                    {!c.is_published && (
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-black/45">
                        비공개
                      </span>
                    )}
                  </div>
                  {p && (
                    <p className="mt-0.5 text-xs text-black/45">
                      마지막 위치 {fmtTime(p.last_position)}
                      {dur > 0 ? ` · 시청 ${pct}%` : ""}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    p?.completed
                      ? "bg-emerald-50 text-emerald-700"
                      : p
                        ? "bg-amber-50 text-amber-700"
                        : "bg-black/5 text-black/45"
                  }`}
                >
                  {p?.completed ? "완료" : p ? "수강 중" : "미시청"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
