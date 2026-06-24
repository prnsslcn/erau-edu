import { getServiceClient } from "@/lib/supabase";
import type { Chapter, Material, Video } from "@/lib/db/types";
import ChapterManager, {
  type ChapterWithContent,
} from "@/components/admin/ChapterManager";

export const dynamic = "force-dynamic";

export default async function ChaptersPage() {
  const db = getServiceClient();
  const [{ data: chapters }, { data: videos }, { data: materials }] =
    await Promise.all([
      db.from("chapters").select("*").order("position", { ascending: true }),
      db.from("videos").select("*").order("position", { ascending: true }),
      db.from("materials").select("*").order("position", { ascending: true }),
    ]);

  const videosByChapter = new Map<string, Video[]>();
  for (const v of (videos as Video[]) ?? []) {
    const arr = videosByChapter.get(v.chapter_id) ?? [];
    arr.push(v);
    videosByChapter.set(v.chapter_id, arr);
  }
  const materialsByChapter = new Map<string, Material[]>();
  for (const m of (materials as Material[]) ?? []) {
    const arr = materialsByChapter.get(m.chapter_id) ?? [];
    arr.push(m);
    materialsByChapter.set(m.chapter_id, arr);
  }

  const data: ChapterWithContent[] = ((chapters as Chapter[]) ?? []).map(
    (c) => ({
      ...c,
      videos: videosByChapter.get(c.id) ?? [],
      materials: materialsByChapter.get(c.id) ?? [],
    }),
  );

  return <ChapterManager chapters={data} />;
}
