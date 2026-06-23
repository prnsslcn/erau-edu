import { getServiceClient } from "@/lib/supabase";
import type { Chapter } from "@/lib/db/types";
import ChapterManager from "@/components/admin/ChapterManager";

export const dynamic = "force-dynamic";

export default async function ChaptersPage() {
  const db = getServiceClient();
  const { data } = await db
    .from("chapters")
    .select("*")
    .order("position", { ascending: true });

  return <ChapterManager chapters={(data as Chapter[]) ?? []} />;
}
