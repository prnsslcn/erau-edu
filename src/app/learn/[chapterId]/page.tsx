import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStudentChapters } from "@/lib/db/learn";
import YouTubePlayer from "@/components/YouTubePlayer";

export const dynamic = "force-dynamic";

export default async function ChapterPlayerPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/login");

  const items = await getStudentChapters(session.sub);
  const index = items.findIndex((i) => i.chapter.id === chapterId);
  if (index === -1) notFound();

  const item = items[index];
  if (!item.unlocked) redirect("/learn"); // 잠긴 강의는 접근 차단

  const { chapter, progress } = item;
  const next = items[index + 1];
  const nextHref = next ? `/learn/${next.chapter.id}` : null;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-6">
      {/* 본문 — 플레이어 */}
      <div className="space-y-5">
        <div>
          <Link href="/learn" className="text-sm text-brand hover:underline">
            ← 강의 목록
          </Link>
          <h1 className="mt-2 text-xl font-bold tracking-tight">
            <span className="text-slate-400">{chapter.position + 1}강 · </span>
            {chapter.title}
          </h1>
          {chapter.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              {chapter.description}
            </p>
          )}
        </div>

        <YouTubePlayer
          chapterId={chapter.id}
          youtubeId={chapter.youtube_id}
          initialPosition={progress?.last_position ?? 0}
          initialWatchedSeconds={progress?.watched_seconds ?? 0}
          initialCompleted={progress?.completed ?? false}
          nextHref={nextHref}
        />

        {chapter.material_url && (
          <a
            href={chapter.material_url}
            target="_blank"
            rel="noopener noreferrer"
            className="neu-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            <span aria-hidden>📄</span> 강의자료 열기
          </a>
        )}
      </div>

      {/* 사이드바 — 강의 목록 */}
      <aside className="mt-6 lg:mt-0">
        <div className="neu-raised sticky top-20 h-full rounded-2xl p-3">
          <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            전체 강의
          </p>
          <ul className="space-y-1">
            {items.map((it) => {
              const c = it.chapter;
              const active = c.id === chapter.id;
              const body = (
                <div
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors ${
                    active
                      ? "bg-brand/10 font-semibold text-brand ring-1 ring-inset ring-brand/20"
                      : it.unlocked
                        ? "text-slate-600"
                        : "text-slate-400"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      it.completed
                        ? "bg-emerald-100 text-emerald-600"
                        : active
                          ? "bg-blue-500 text-white"
                          : it.unlocked
                            ? "bg-slate-200 text-slate-500"
                            : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {it.completed ? "✓" : it.unlocked ? c.position + 1 : "🔒"}
                  </span>
                  <span className="truncate">{c.title}</span>
                </div>
              );
              return (
                <li key={c.id}>
                  {it.unlocked ? (
                    <Link href={`/learn/${c.id}`} className="block">
                      {body}
                    </Link>
                  ) : (
                    <div aria-disabled className="cursor-not-allowed">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
