"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase";
import { requireRole } from "@/lib/auth/session";
import { chapterSchema } from "@/lib/validation";
import { extractYouTubeId } from "@/lib/youtube";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function parse(formData: FormData) {
  return chapterSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    youtube_id: formData.get("youtube_id"),
    material_url: formData.get("material_url"),
    position: formData.get("position"),
    is_published: formData.get("is_published") === "on",
  });
}

export async function createChapter(formData: FormData): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const youtube_id = extractYouTubeId(parsed.data.youtube_id);
  if (!youtube_id) {
    return { ok: false, error: "올바른 YouTube 링크 또는 영상 ID가 아닙니다." };
  }

  const db = getServiceClient();
  const { error } = await db.from("chapters").insert({
    title: parsed.data.title,
    description: parsed.data.description || null,
    youtube_id,
    material_url: parsed.data.material_url || null,
    position: parsed.data.position,
    is_published: parsed.data.is_published,
  });

  if (error) return { ok: false, error: "저장 중 오류가 발생했습니다." };

  revalidatePath("/admin/chapters");
  revalidatePath("/learn");
  return { ok: true };
}

export async function updateChapter(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const youtube_id = extractYouTubeId(parsed.data.youtube_id);
  if (!youtube_id) {
    return { ok: false, error: "올바른 YouTube 링크 또는 영상 ID가 아닙니다." };
  }

  const db = getServiceClient();
  const { error } = await db
    .from("chapters")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      youtube_id,
      material_url: parsed.data.material_url || null,
      position: parsed.data.position,
      is_published: parsed.data.is_published,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: "수정 중 오류가 발생했습니다." };

  revalidatePath("/admin/chapters");
  revalidatePath("/learn");
  return { ok: true };
}

export async function deleteChapter(id: string): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };

  const db = getServiceClient();
  const { error } = await db.from("chapters").delete().eq("id", id);
  if (error) return { ok: false, error: "삭제 중 오류가 발생했습니다." };

  revalidatePath("/admin/chapters");
  revalidatePath("/learn");
  return { ok: true };
}
