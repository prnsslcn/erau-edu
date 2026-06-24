import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStudentChapters } from "@/lib/db/learn";
import { getServiceClient } from "@/lib/supabase";
import type { Material } from "@/lib/db/types";
import ChapterVideos from "@/components/ChapterVideos";

export const dynamic = "force-dynamic";

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
}

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
  if (!item.unlocked) redirect("/learn");

  const { chapter, videos } = item;
  const next = items[index + 1];

  const db = getServiceClient();
  const { data: materialsData } = await db
    .from("materials")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("position", { ascending: true });
  const materials = (materialsData as Material[]) ?? [];

  return (
    <div>
      <Link href="/learn" className="text-sm text-brand hover:underline">
        ← 강의 목록
      </Link>
      <div className="mt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_300px_260px] lg:items-baseline lg:gap-6">
        {/* 1) 강의 영상 */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-slate-400">{chapter.position + 1}강 · </span>
            {chapter.title}
          </h1>
          {chapter.description && (
            <p className="mt-1.5 text-base leading-relaxed text-slate-500">
              {chapter.description}
            </p>
          )}
        </div>

        {videos.length === 0 ? (
          materials.length === 0 ? (
            <p className="neu-flat rounded-2xl p-8 text-center text-sm text-slate-400">
              등록된 영상이 없습니다.
            </p>
          ) : (
            <p className="neu-flat rounded-2xl p-6 text-center text-sm text-slate-500">
              이 강의는 영상 없이 강의 자료로 구성되어 있습니다. 우측 자료를 확인하세요.
            </p>
          )
        ) : (
          <ChapterVideos
            videos={videos.map((v) => ({
              id: v.video.id,
              youtube_id: v.video.youtube_id,
              title: v.video.title,
              last_position: v.progress?.last_position ?? 0,
              watched_seconds: v.progress?.watched_seconds ?? 0,
              completed: v.completed,
            }))}
          />
        )}

        {item.completed && next && (
          <div className="neu-raised-sm flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
            <p className="text-sm font-medium text-emerald-700">
              이 강의를 완료했습니다. 다음 강의가 열렸습니다.
            </p>
            <Link
              href={`/learn/${next.chapter.id}`}
              className="neu-btn-primary shrink-0 px-4 py-2 text-sm"
            >
              Next →
            </Link>
          </div>
        )}
      </div>

      {/* 2) 강의 자료 */}
      <div className="mt-6 lg:mt-0">
        <h2 className="text-3xl font-black text-slate-700">강의 자료</h2>
        {materials.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">등록된 자료가 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {materials.map((m) => (
              <li key={m.id}>
                <a
                  href={`/api/materials/${m.id}`}
                  className="neu-btn flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden>📄</span>
                    <span className="truncate font-light text-slate-700">
                      {m.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {fmtSize(m.size_bytes)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 3) ALL 사이드바 */}
      <aside className="mt-6 lg:mt-0">
        <h2 className="text-3xl font-black text-slate-700">전체 강의</h2>
        <div className="neu-raised sticky top-24 mt-2 rounded-2xl p-3">
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
                        ? "bg-lime-500 text-white"
                        : active
                          ? "bg-blue-500 text-white"
                          : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {it.materialsOnly
                      ? "📄"
                      : it.completed
                        ? "✓"
                        : it.unlocked
                          ? c.position + 1
                          : "🔒"}
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
    </div>
  );
}
