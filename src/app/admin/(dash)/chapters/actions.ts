"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase";
import { requireRole } from "@/lib/auth/session";
import { chapterSchema, videoSchema } from "@/lib/validation";
import { extractYouTubeId } from "@/lib/youtube";
import {
  createBunnyVideo,
  createBunnyUploadTicket,
  getBunnyVideo,
  deleteBunnyVideo,
} from "@/lib/bunny";

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
  // 직접 업로드 영상의 Bunny 원본도 정리 (DB 행은 FK cascade로 지워지지만 Bunny는 별개)
  const { data: uploaded } = await db
    .from("videos")
    .select("asset_id")
    .eq("chapter_id", id)
    .eq("source", "bunny");
  for (const v of uploaded ?? []) {
    if (v.asset_id) await deleteBunnyVideo(v.asset_id).catch(() => {});
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

  // 직접 업로드 영상이면 Bunny 쪽 원본도 함께 지운다(요금이 저장 용량 기준이므로 방치 금물)
  const { data: row } = await db
    .from("videos")
    .select("source, asset_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.from("videos").delete().eq("id", id);
  if (error) return { ok: false, error: "영상 삭제 중 오류가 발생했습니다." };

  if (row?.source === "bunny" && row.asset_id) {
    await deleteBunnyVideo(row.asset_id).catch(() => {});
  }

  revalidate();
  return { ok: true };
}

// ─────────────── 직접 업로드 영상 (Bunny Stream) ───────────────
// 자료 PDF와 동일한 티켓 방식. 목적지만 Supabase Storage → Bunny 로 바뀐다.
//   ① createVideoUploadTicket : Bunny에 영상 자리 생성 + TUS 서명 발급
//   ② (브라우저가 TUS로 직접 업로드 — 끊기면 이어서 재개)
//   ③ finalizeUploadedVideo   : 업로드 확인 후 DB 행 생성

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv)$/i;
const MAX_VIDEO_BYTES = 5_000_000_000; // 5GB — 사고성 대용량 업로드 방지용 상한

export interface VideoUploadTicket extends ActionResult {
  endpoint?: string;
  libraryId?: string;
  videoId?: string;
  signature?: string;
  expire?: number;
}

export async function createVideoUploadTicket(
  chapterId: string,
  fileName: string,
  sizeBytes: number,
): Promise<VideoUploadTicket> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };

  if (!VIDEO_EXT.test(fileName))
    return {
      ok: false,
      error: "영상 파일만 업로드할 수 있습니다 (mp4, mov, m4v, webm, mkv).",
    };
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0)
    return { ok: false, error: "빈 파일입니다." };
  if (sizeBytes > MAX_VIDEO_BYTES)
    return { ok: false, error: "파일이 너무 큽니다 (최대 5GB)." };

  const db = getServiceClient();
  const { data: chapter } = await db
    .from("chapters")
    .select("id")
    .eq("id", chapterId)
    .maybeSingle();
  if (!chapter) return { ok: false, error: "챕터를 찾을 수 없습니다." };

  try {
    const guid = await createBunnyVideo(fileName.replace(VIDEO_EXT, ""));
    const ticket = createBunnyUploadTicket(guid);
    return { ok: true, ...ticket };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "업로드 준비에 실패했습니다.",
    };
  }
}

export async function finalizeUploadedVideo(
  chapterId: string,
  guid: string,
  title: string,
): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  if (!/^[0-9a-f-]{36}$/i.test(guid))
    return { ok: false, error: "잘못된 영상 식별자입니다." };

  // 업로드가 실제로 Bunny에 도착했는지 확인 (클라이언트 보고를 믿지 않는다)
  const video = await getBunnyVideo(guid).catch(() => null);
  if (!video) return { ok: false, error: "업로드된 영상을 찾을 수 없습니다." };

  const db = getServiceClient();
  const { count } = await db
    .from("videos")
    .select("*", { count: "exact", head: true })
    .eq("chapter_id", chapterId);

  const { error } = await db.from("videos").insert({
    chapter_id: chapterId,
    source: "bunny",
    asset_id: guid,
    youtube_id: null,
    title: title.trim() || video.title || null,
    // 길이는 인코딩 완료 후에야 확정된다. 비워두면 학생 첫 재생 때 /api/progress 가 채운다.
    duration_seconds: video.length > 0 ? video.length : null,
    position: count ?? 0,
  });
  if (error) {
    await deleteBunnyVideo(guid).catch(() => {});
    return { ok: false, error: "영상 저장 중 오류가 발생했습니다." };
  }

  revalidate();
  return { ok: true };
}

// 인코딩 진행 상황 조회 (관리자 화면 폴링용)
export interface VideoStatus {
  guid: string;
  status: number; // 4 = 재생 가능
  encodeProgress: number;
  length: number;
}

export async function getUploadedVideoStatuses(
  guids: string[],
): Promise<VideoStatus[]> {
  if (!(await requireRole("admin"))) return [];
  const unique = [...new Set(guids)].slice(0, 50);
  const rows = await Promise.all(
    unique.map(async (guid) => {
      const v = await getBunnyVideo(guid).catch(() => null);
      return v
        ? {
            guid,
            status: v.status,
            encodeProgress: v.encodeProgress,
            length: v.length,
          }
        : null;
    }),
  );
  return rows.filter((r): r is VideoStatus => r !== null);
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
