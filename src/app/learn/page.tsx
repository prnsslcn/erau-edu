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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">강의 목록</h1>
        <p className="mt-1 text-sm text-black/55">
          순서대로 수강하세요. 강의를 완료하면 다음 강의가 열립니다.
          {items.length > 0 && ` (완료 ${completed} / ${items.length})`}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/45">
          아직 공개된 강의가 없습니다. 곧 등록될 예정입니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map(({ chapter, completed, unlocked }) => {
            const status = completed
              ? { label: "완료", cls: "bg-emerald-50 text-emerald-700" }
              : unlocked
                ? { label: "수강 가능", cls: "bg-brand/10 text-brand" }
                : { label: "잠김", cls: "bg-black/5 text-black/40" };

            const inner = (
              <div
                className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition ${
                  unlocked
                    ? "border-black/10 bg-white hover:border-brand/40 hover:shadow-sm"
                    : "border-black/8 bg-black/[.02]"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-black/35">
                      {chapter.position + 1}강
                    </span>
                    <span
                      className={`font-semibold ${unlocked ? "" : "text-black/40"}`}
                    >
                      {chapter.title}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-black/45">
                    {unlocked
                      ? chapter.description || "강의를 시청하세요."
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
