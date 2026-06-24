"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase";
import { requireRole } from "@/lib/auth/session";
import { chapterSchema, videoSchema } from "@/lib/validation";
import { extractYouTubeId } from "@/lib/youtube";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidate() {
  revalidatePath("/admin/chapters");
  revalidatePath("/learn");
}

// ─────────────── 챕터 ───────────────
function parseChapter(formData: FormData) {
  return chapterSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    position: formData.get("position"),
    is_published: formData.get("is_published") === "on",
  });
}

export async function createChapter(formData: FormData): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  const parsed = parseChapter(formData);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message };

  // 폼에서 함께 받은 클립/자료를 먼저 검증 (부분 생성 방지)
  const clipUrls = formData.getAll("clip_youtube").map((v) => String(v).trim());
  const clipTitles = formData.getAll("clip_title").map((v) => String(v).trim());
  const clips: { youtube_id: string; title: string | null }[] = [];
  for (let i = 0; i < clipUrls.length; i++) {
    if (!clipUrls[i]) continue;
    const yid = extractYouTubeId(clipUrls[i]);
    if (!yid)
      return {
        ok: false,
        error: `클립 ${i + 1}: 올바른 YouTube 링크 또는 ID가 아닙니다.`,
      };
    clips.push({ youtube_id: yid, title: clipTitles[i] || null });
  }

  const matFiles = formData.getAll("material_file");
  const matTitles = formData.getAll("material_title").map((v) => String(v));
  const materials: { file: File; title: string }[] = [];
  for (let i = 0; i < matFiles.length; i++) {
    const f = matFiles[i];
    if (!(f instanceof File) || f.size === 0) continue;
    if (f.type !== "application/pdf")
      return { ok: false, error: `자료 ${i + 1}: PDF 파일만 업로드할 수 있습니다.` };
    if (f.size > 50 * 1024 * 1024)
      return { ok: false, error: `자료 ${i + 1}: 파일이 너무 큽니다 (최대 50MB).` };
    materials.push({ file: f, title: matTitles[i]?.trim() || f.name });
  }

  const db = getServiceClient();
  const { data: chapter, error } = await db
    .from("chapters")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      position: parsed.data.position,
      is_published: parsed.data.is_published,
    })
    .select("id")
    .single();
  if (error || !chapter)
    return { ok: false, error: "저장 중 오류가 발생했습니다." };

  if (clips.length > 0) {
    await db.from("videos").insert(
      clips.map((c, i) => ({
        chapter_id: chapter.id,
        youtube_id: c.youtube_id,
        title: c.title,
        position: i,
      })),
    );
  }

  for (let i = 0; i < materials.length; i++) {
    const { file, title } = materials[i];
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${chapter.id}/${Date.now()}_${i}_${safe}`;
    const { error: upErr } = await db.storage
      .from("materials")
      .upload(path, await file.arrayBuffer(), {
        contentType: "application/pdf",
        upsert: false,
      });
    if (upErr) continue;
    await db.from("materials").insert({
      chapter_id: chapter.id,
      title,
      storage_path: path,
      size_bytes: file.size,
      position: i,
    });
  }

  revalidate();
  return { ok: true };
}

export async function updateChapter(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  const parsed = parseChapter(formData);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message };

  const db = getServiceClient();
  const { error } = await db
    .from("chapters")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      position: parsed.data.position,
      is_published: parsed.data.is_published,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: "수정 중 오류가 발생했습니다." };
  revalidate();
  return { ok: true };
}

export async function deleteChapter(id: string): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  const db = getServiceClient();
  // 챕터 자료의 스토리지 파일도 정리
  const { data: mats } = await db
    .from("materials")
    .select("storage_path")
    .eq("chapter_id", id);
  if (mats && mats.length > 0) {
    await db.storage.from("materials").remove(mats.map((m) => m.storage_path));
  }
  const { error } = await db.from("chapters").delete().eq("id", id);
  if (error) return { ok: false, error: "삭제 중 오류가 발생했습니다." };
  revalidate();
  return { ok: true };
}

// ─────────────── 영상 ───────────────
export async function addVideo(
  chapterId: string,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  const parsed = videoSchema.safeParse({
    title: formData.get("title"),
    youtube_id: formData.get("youtube_id"),
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message };

  const youtube_id = extractYouTubeId(parsed.data.youtube_id);
  if (!youtube_id)
    return { ok: false, error: "올바른 YouTube 링크 또는 영상 ID가 아닙니다." };

  const db = getServiceClient();
  const { count } = await db
    .from("videos")
    .select("*", { count: "exact", head: true })
    .eq("chapter_id", chapterId);

  const { error } = await db.from("videos").insert({
    chapter_id: chapterId,
    title: parsed.data.title || null,
    youtube_id,
    position: count ?? 0,
  });
  if (error) return { ok: false, error: "Clip 추가 중 오류가 발생했습니다." };
  revalidate();
  return { ok: true };
}

export async function deleteVideo(id: string): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  const db = getServiceClient();
  const { error } = await db.from("videos").delete().eq("id", id);
  if (error) return { ok: false, error: "Clip 삭제 중 오류가 발생했습니다." };
  revalidate();
  return { ok: true };
}

// ─────────────── 자료 (PDF) ───────────────
export async function uploadMaterial(
  chapterId: string,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "파일을 선택하세요." };
  if (file.type !== "application/pdf")
    return { ok: false, error: "PDF 파일만 업로드할 수 있습니다." };
  if (file.size > 50 * 1024 * 1024)
    return { ok: false, error: "파일이 너무 큽니다 (최대 50MB)." };

  const titleInput = (formData.get("title") as string | null)?.trim();
  const title = titleInput || file.name;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${chapterId}/${Date.now()}_${safeName}`;

  const db = getServiceClient();
  const { error: upErr } = await db.storage
    .from("materials")
    .upload(path, await file.arrayBuffer(), {
      contentType: "application/pdf",
      upsert: false,
    });
  if (upErr) return { ok: false, error: "업로드 실패: " + upErr.message };

  const { count } = await db
    .from("materials")
    .select("*", { count: "exact", head: true })
    .eq("chapter_id", chapterId);

  const { error } = await db.from("materials").insert({
    chapter_id: chapterId,
    title,
    storage_path: path,
    size_bytes: file.size,
    position: count ?? 0,
  });
  if (error) {
    await db.storage.from("materials").remove([path]);
    return { ok: false, error: "자료 저장 중 오류가 발생했습니다." };
  }
  revalidate();
  return { ok: true };
}

export async function deleteMaterial(id: string): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  const db = getServiceClient();
  const { data: mat } = await db
    .from("materials")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (mat?.storage_path) {
    await db.storage.from("materials").remove([mat.storage_path]);
  }
  const { error } = await db.from("materials").delete().eq("id", id);
  if (error) return { ok: false, error: "자료 삭제 중 오류가 발생했습니다." };
  revalidate();
  return { ok: true };
}
