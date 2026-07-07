import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStudentDetail } from "@/lib/db/progress";
import NeuProgress from "@/components/NeuProgress";
import MyAccount from "@/components/MyAccount";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/login");

  const detail = await getStudentDetail(session.sub);
  if (!detail) redirect("/login");

  const { student, chapters } = detail;
  const published = chapters.filter((c) => c.is_published);
  const videoChapters = published.filter((c) => !c.materialsOnly);
  const completed = videoChapters.filter((c) => c.completed).length;
  const total = videoChapters.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MyPage</h1>
          <p className="mt-1 text-sm text-slate-500">
            {student.name} · {formatPhone(student.phone)} · 가입{" "}
            {student.created_at.slice(0, 10)}
          </p>
        </div>
        <Link href="/learn" className="neu-btn shrink-0 px-4 py-2 text-sm text-slate-600">
          강의 목록
        </Link>
      </div>

      {/* 진도 요약 */}
      <div className="neu-raised rounded-2xl p-5">
        <div className="mb-2 flex items-end justify-between">
          <p className="text-sm font-semibold text-slate-700">전체 진도율</p>
          <p className="text-sm text-slate-500">
            완료 {completed} / {total} 강의
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NeuProgress percent={percent} className="h-2.5 flex-1" />
          <span className="w-12 text-right text-lg font-bold tabular-nums text-slate-700">
            {percent}%
          </span>
        </div>
      </div>

      {/* 강의별 진도 */}
      <div className="neu-raised rounded-2xl p-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">강의별 진도</p>
        {published.length === 0 ? (
          <p className="text-sm text-slate-400">아직 공개된 강의가 없습니다.</p>
        ) : (
          <ul className="space-y-2.5">
            {published.map((c) => {
              const done = c.videos.filter((v) => v.completed).length;
              const totalClips = c.videos.length;
              const status = c.materialsOnly
                ? { label: "자료", cls: "bg-slate-300/40 text-slate-500" }
                : c.completed
                  ? { label: "완료", cls: "bg-emerald-400/15 text-emerald-700" }
                  : c.unlocked
                    ? { label: "수강중", cls: "bg-brand/10 text-brand" }
                    : { label: "잠김", cls: "bg-slate-400/10 text-slate-400" };
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl bg-slate-200/40 px-4 py-3"
                >
                  <span className="w-7 shrink-0 text-xs font-semibold text-slate-400">
                    {c.position + 1}강
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {c.title}
                    </p>
                    {!c.materialsOnly && totalClips > 0 && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <NeuProgress
                          percent={(done / totalClips) * 100}
                          tone="gray"
                          className="h-1.5 flex-1"
                        />
                        <span className="shrink-0 text-xs text-slate-400">
                          {done}/{totalClips}
                        </span>
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.cls}`}
                  >
                    {status.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 계정 관리 (비밀번호 변경 · 회원탈퇴) */}
      <MyAccount />
    </div>
  );
}
