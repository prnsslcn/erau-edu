import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStudentChapters } from "@/lib/db/learn";
import NeuProgress from "@/components/NeuProgress";

export const dynamic = "force-dynamic";

function fmtDuration(sec: number): string | null {
  if (!sec) return null;
  const total = Math.round(sec / 60);
  if (total < 60) return `${total}분`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

export default async function LearnHome() {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/login");

  const items = await getStudentChapters(session.sub);
  const completed = items.filter((i) => i.completed).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {items.map(
            ({ chapter, videos, completed, unlocked, materialsOnly }) => {
              const doneVideos = videos.filter((v) => v.completed).length;
              const thumbId = videos[0]?.video.youtube_id ?? null;
              const totalSec = videos.reduce(
                (s, v) => s + (v.video.duration_seconds ?? 0),
                0,
              );
              const durationLabel = fmtDuration(totalSec);
              const status = materialsOnly
                ? { label: "Materials", cls: "bg-slate-300/40 text-slate-500 ring-slate-400/30" }
                : completed
                  ? { label: "Done", cls: "bg-emerald-400/15 text-emerald-700 ring-emerald-400/30" }
                  : unlocked
                    ? { label: "Open", cls: "bg-brand/10 text-brand ring-brand/20" }
                    : { label: "Locked", cls: "bg-slate-400/10 text-slate-400 ring-slate-300/40" };

              const card = (
                <div
                  className={`group relative flex h-[300px] flex-col overflow-hidden rounded-2xl p-6 transition-shadow ${
                    unlocked
                      ? "neu-raised-sm hover:shadow-[4px_4px_10px_#e5eaf1,-4px_-4px_10px_#ffffff,inset_2px_2px_6px_#e5eaf1,inset_-2px_-2px_6px_#ffffff]"
                      : "neu-flat"
                  }`}
                >
                  {/* 앞면 */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-400">
                      {chapter.position + 1}강
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.cls}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <h3
                    className={`mt-3 line-clamp-2 text-lg font-semibold leading-snug ${
                      unlocked ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {chapter.title}
                  </h3>

                  <div className="mt-auto pt-3">
                    {materialsOnly ? (
                      <p className="text-xs text-slate-400">강의 자료</p>
                    ) : !unlocked ? (
                      <p className="text-xs text-slate-400">
                        🔒 이전 강의 완료 시 열림
                      </p>
                    ) : videos.length > 0 ? (
                      <>
                        <div className="mb-1 flex justify-between text-xs text-slate-400">
                          <span>
                            Clip {doneVideos} / {videos.length}
                          </span>
                          {completed && (
                            <span className="text-emerald-600">완료</span>
                          )}
                        </div>
                        <NeuProgress
                          percent={(doneVideos / videos.length) * 100}
                          tone="gray"
                          className="h-1.5"
                        />
                      </>
                    ) : null}
                  </div>

                  {/* hover 시 세부 정보 (잠긴 강의도 미리보기) */}
                  <div className="pointer-events-none absolute inset-2 flex flex-col rounded-xl bg-slate-100 p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {/* 썸네일 (상단, 크게) */}
                    <div className="h-32 w-full shrink-0 overflow-hidden rounded-lg bg-slate-800">
                      {thumbId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://img.youtube.com/vi/${thumbId}/hqdefault.jpg`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-5xl">
                          📄
                        </div>
                      )}
                    </div>

                    {/* 본문 (썸네일 아래) */}
                    <div className="mt-3 flex min-h-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-brand">
                          {chapter.position + 1}강
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${status.cls}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <h4 className="mt-1 line-clamp-1 font-semibold leading-snug text-slate-700">
                        {chapter.title}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">
                        {chapter.description ||
                          (materialsOnly
                            ? "강의 자료를 확인하세요."
                            : "강의를 시청하세요.")}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs">
                        <span className="text-slate-400">
                          {materialsOnly
                            ? "강의 자료"
                            : `클립 ${videos.length}개${
                                durationLabel ? ` · ${durationLabel}` : ""
                              }`}
                        </span>
                        <span
                          className={`shrink-0 text-sm font-semibold ${
                            unlocked ? "text-brand" : "text-slate-400"
                          }`}
                        >
                          {unlocked ? "수강하기 →" : "🔒 잠김"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );

              return (
                <li key={chapter.id}>
                  {unlocked ? (
                    <Link href={`/learn/${chapter.id}`} className="block h-full">
                      {card}
                    </Link>
                  ) : (
                    <div aria-disabled className="h-full cursor-not-allowed">
                      {card}
                    </div>
                  )}
                </li>
              );
            },
          )}
        </ul>
      )}
    </div>
  );
}
