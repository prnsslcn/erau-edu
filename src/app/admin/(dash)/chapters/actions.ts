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

// 자료 PDF 상한 — Storage 버킷(materials)에 걸린 file_size_limit 과 동일하게 맞춘다.
// (버킷 한도를 넘기면 업로드가 Storage 단에서 거부된다)
const MAX_PDF_BYTES = 50_000_000;

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

// 챕터 생성 결과 — 생성 직후 클라이언트가 자료를 직접 업로드할 수 있게 id를 돌려준다.
export interface CreateChapterResult extends ActionResult {
  id?: string;
}

export async function createChapter(
  formData: FormData,
): Promise<CreateChapterResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  const parsed = parseChapter(formData);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message };

  // 폼에서 함께 받은 클립을 먼저 검증 (부분 생성 방지).
  // 자료 PDF는 이 액션을 거치지 않는다 — 챕터 생성 후 브라우저가 Storage로 직접 업로드.
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

  revalidate();
  return { ok: true, id: chapter.id };
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

type Dir = "up" | "down";

// 같은 챕터 내 항목 순서 변경: 인접 항목과 교환 후 position을 0..n으로 정규화
async function moveRow(
  table: "videos" | "materials",
  id: string,
  dir: Dir,
): Promise<ActionResult> {
  const db = getServiceClient();
  const { data: cur } = await db
    .from(table)
    .select("id,chapter_id,position")
    .eq("id", id)
    .maybeSingle();
  if (!cur) return { ok: false, error: "항목을 찾을 수 없습니다." };

  const { data: rows } = await db
    .from(table)
    .select("id,position")
    .eq("chapter_id", cur.chapter_id)
    .order("position", { ascending: true });
  const list = (rows ?? []) as { id: string; position: number }[];

  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return { ok: false, error: "항목을 찾을 수 없습니다." };
  const target = dir === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= list.length) return { ok: true }; // 경계 → no-op

  [list[idx], list[target]] = [list[target], list[idx]];
  for (let i = 0; i < list.length; i++) {
    if (list[i].position !== i) {
      await db.from(table).update({ position: i }).eq("id", list[i].id);
    }
  }
  revalidate();
  return { ok: true };
}

export async function moveVideo(id: string, dir: Dir): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  return moveRow("videos", id, dir);
}

export async function moveMaterial(id: string, dir: Dir): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  return moveRow("materials", id, dir);
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
// 업로드는 2단계다. 파일 바이트가 서버 함수를 통과하지 않는 게 핵심:
//   Next.js Server Action 기본 본문 상한 1MB, Vercel 함수 하드캡 4.5MB, Hobby 실행시간 10초.
//   → 서버는 서명된 업로드 URL(티켓)만 발급하고, 브라우저가 Storage로 직접 PUT 한다.
//   ① createMaterialUploadTicket : 검증 후 업로드 URL 발급
//   ② (브라우저가 직접 PUT)
//   ③ finalizeMaterial           : 실제 업로드 결과를 확인하고 DB 행 생성

export interface UploadTicket extends ActionResult {
  url?: string; // 브라우저가 PUT 할 서명 URL (토큰 포함)
  path?: string; // 확정 단계에서 그대로 돌려줘야 하는 경로
}

export async function createMaterialUploadTicket(
  chapterId: string,
  fileName: string,
  sizeBytes: number,
): Promise<UploadTicket> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };

  if (!/\.pdf$/i.test(fileName))
    return { ok: false, error: "PDF 파일만 업로드할 수 있습니다." };
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0)
    return { ok: false, error: "빈 파일입니다." };
  if (sizeBytes > MAX_PDF_BYTES)
    return { ok: false, error: "파일이 너무 큽니다 (최대 50MB)." };

  const db = getServiceClient();
  const { data: chapter } = await db
    .from("chapters")
    .select("id")
    .eq("id", chapterId)
    .maybeSingle();
  if (!chapter) return { ok: false, error: "챕터를 찾을 수 없습니다." };

  // 경로는 서버가 정한다 (클라이언트가 임의 경로를 덮어쓰지 못하도록)
  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  const path = `${chapterId}/${Date.now()}_${safeName}`;

  const { data, error } = await db.storage
    .from("materials")
    .createSignedUploadUrl(path);
  if (error || !data)
    return { ok: false, error: "업로드 URL 발급에 실패했습니다." };

  return { ok: true, url: data.signedUrl, path: data.path };
}

export async function finalizeMaterial(
  chapterId: string,
  path: string,
  title: string,
): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };

  // 티켓에서 발급한 형태의 경로만 허용
  if (!new RegExp(`^${chapterId}/\\d+_[\\w.\\-]+$`).test(path))
    return { ok: false, error: "잘못된 업로드 경로입니다." };

  const db = getServiceClient();
  const fileName = path.slice(chapterId.length + 1);

  // 파일이 실제로 올라왔는지 Storage에서 직접 확인 (크기도 클라이언트 말 대신 여기서 읽는다)
  const { data: files } = await db.storage
    .from("materials")
    .list(chapterId, { search: fileName });
  const uploaded = files?.find((f) => f.name === fileName);
  if (!uploaded)
    return { ok: false, error: "업로드된 파일을 찾을 수 없습니다." };

  const size = (uploaded.metadata?.size as number | undefined) ?? null;
  const { count } = await db
    .from("materials")
    .select("*", { count: "exact", head: true })
    .eq("chapter_id", chapterId);

  const { error } = await db.from("materials").insert({
    chapter_id: chapterId,
    title: title.trim() || fileName,
    storage_path: path,
    size_bytes: size,
    position: count ?? 0,
  });
  if (error) {
    // DB 행 생성 실패 시 고아 파일이 남지 않도록 정리
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
