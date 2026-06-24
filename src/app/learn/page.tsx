import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStudentChapters } from "@/lib/db/learn";

export const dynamic = "force-dynamic";

export default async function LearnHome() {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/login");

  const items = await getStudentChapters(session.sub);
  const completed = items.filter((i) => i.completed).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand">
          {session.name}님 반갑습니다.
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">강의 목록</h1>
        <p className="mt-1 text-sm text-slate-500">
          순서대로 수강하세요. 강의를 완료하면 다음 강의가 열립니다.
          {items.length > 0 && ` (완료 ${completed} / ${items.length})`}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="neu-flat rounded-2xl p-10 text-center text-sm text-slate-400">
          아직 공개된 강의가 없습니다. 곧 등록될 예정입니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map(({ chapter, videos, completed, unlocked }) => {
            const doneVideos = videos.filter((v) => v.completed).length;
            const status = completed
              ? {
                  label: "Done",
                  cls: "bg-emerald-400/15 text-emerald-700 ring-1 ring-inset ring-emerald-400/30",
                }
              : unlocked
                ? {
                    label: "Open",
                    cls: "bg-brand/10 text-brand ring-1 ring-inset ring-brand/20",
                  }
                : {
                    label: "Locked",
                    cls: "bg-slate-400/10 text-slate-400 ring-1 ring-inset ring-slate-300/40",
                  };

            const inner = (
              <div
                className={`flex items-center justify-between gap-4 rounded-2xl p-4 ${
                  unlocked
                    ? "neu-raised-sm hover:-translate-y-0.5"
                    : "neu-flat"
                } transition-all duration-200`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">
                      {chapter.position + 1}강
                    </span>
                    <span
                      className={`font-semibold ${unlocked ? "" : "text-slate-400"}`}
                    >
                      {chapter.title}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {unlocked
                      ? videos.length > 0
                        ? `영상 ${doneVideos} / ${videos.length} 완료${chapter.description ? ` · ${chapter.description}` : ""}`
                        : chapter.description || "강의를 시청하세요."
                      : "이전 강의를 완료하면 열립니다."}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.cls}`}
                >
                  {status.label}
                </span>
              </div>
            );

            return (
              <li key={chapter.id}>
                {unlocked ? (
                  <Link href={`/learn/${chapter.id}`} className="block">
                    {inner}
                  </Link>
                ) : (
                  <div aria-disabled className="cursor-not-allowed">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
