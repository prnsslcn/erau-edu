import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStudentChapters } from "@/lib/db/learn";
import ChapterGrid, { type TileItem } from "@/components/ChapterGrid";

export const dynamic = "force-dynamic";

export default async function LearnHome() {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/login");

  const items = await getStudentChapters(session.sub);
  const completed = items.filter((i) => i.completed).length;

  const tiles: TileItem[] = items.map(
    ({ chapter, videos, completed, unlocked, materialsOnly }) => ({
      id: chapter.id,
      position: chapter.position,
      title: chapter.title,
      description: chapter.description,
      thumbId: videos[0]?.video.youtube_id ?? null,
      doneVideos: videos.filter((v) => v.completed).length,
      totalVideos: videos.length,
      completed,
      unlocked,
      materialsOnly,
    }),
  );

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

      {tiles.length === 0 ? (
        <p className="neu-flat rounded-2xl p-10 text-center text-sm text-slate-400">
          아직 공개된 강의가 없습니다. 곧 등록될 예정입니다.
        </p>
      ) : (
        <ChapterGrid items={tiles} />
      )}
    </div>
  );
}
