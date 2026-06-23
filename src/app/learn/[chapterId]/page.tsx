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
    <div className="space-y-5">
      <div>
        <Link href="/learn" className="text-sm text-brand hover:underline">
          ← 강의 목록
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight">
          <span className="text-black/40">{chapter.position + 1}강 · </span>
          {chapter.title}
        </h1>
        {chapter.description && (
          <p className="mt-1.5 text-sm leading-relaxed text-black/55">
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
          className="inline-flex items-center gap-2 rounded-lg border border-black/12 bg-white px-4 py-2.5 text-sm font-medium text-black/70 transition hover:border-brand/40"
        >
          📄 강의자료 열기
        </a>
      )}
    </div>
  );
}
