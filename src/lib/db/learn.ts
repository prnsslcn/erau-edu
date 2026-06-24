import "server-only";
import { getServiceClient } from "@/lib/supabase";
import type { Chapter, Material, Video, VideoProgress } from "./types";

export type VideoProgressLite = Pick<
  VideoProgress,
  "watched_seconds" | "last_position" | "completed"
>;

export interface StudentVideo {
  video: Video;
  progress: VideoProgressLite | null;
  completed: boolean;
}

export interface StudentChapter {
  chapter: Chapter;
  videos: StudentVideo[];
  completed: boolean; // 영상 챕터의 모든 영상 완료 (자료 챕터는 false)
  unlocked: boolean; // 이전 영상 챕터 완료 또는 수동 해제 (자료 챕터는 항상 true)
  overridden: boolean;
  materialsOnly: boolean; // 영상이 없는 자료 전용 챕터 (잠금 체인에서 제외)
}

async function loadStudentData(studentId: string) {
  const db = getServiceClient();
  const [
    { data: chapters },
    { data: videos },
    { data: progress },
    { data: unlocks },
  ] = await Promise.all([
    db
      .from("chapters")
      .select("*")
      .eq("is_published", true)
      .order("position", { ascending: true }),
    db.from("videos").select("*").order("position", { ascending: true }),
    db.from("video_progress").select("*").eq("student_id", studentId),
    db.from("chapter_unlocks").select("*").eq("student_id", studentId),
  ]);

  const progressByVideo = new Map(
    (progress ?? []).map((p) => [p.video_id, p as VideoProgress]),
  );
  const overrideByChapter = new Map(
    (unlocks ?? []).map((u) => [u.chapter_id, u.unlocked_override as boolean]),
  );
  const videosByChapter = new Map<string, Video[]>();
  for (const v of (videos as Video[]) ?? []) {
    const arr = videosByChapter.get(v.chapter_id) ?? [];
    arr.push(v);
    videosByChapter.set(v.chapter_id, arr);
  }

  return {
    chapters: (chapters as Chapter[]) ?? [],
    videosByChapter,
    progressByVideo,
    overrideByChapter,
  };
}

function buildStudentVideos(
  videos: Video[],
  progressByVideo: Map<string, VideoProgress>,
): StudentVideo[] {
  return videos.map((video) => {
    const p = progressByVideo.get(video.id) ?? null;
    return {
      video,
      progress: p,
      completed: p?.completed ?? false,
    };
  });
}

// 공개 챕터를 순서대로, 영상/진도/잠금 상태와 함께 반환 (강의 목록 페이지)
export async function getStudentChapters(
  studentId: string,
): Promise<StudentChapter[]> {
  const { chapters, videosByChapter, progressByVideo, overrideByChapter } =
    await loadStudentData(studentId);

  let prevCompleted = true; // 첫 영상 챕터는 항상 열림
  return chapters.map((chapter) => {
    const videos = buildStudentVideos(
      videosByChapter.get(chapter.id) ?? [],
      progressByVideo,
    );
    const materialsOnly = videos.length === 0;
    const overridden = overrideByChapter.get(chapter.id) ?? false;

    // 자료 전용 챕터: 항상 열림, 잠금 체인에 영향 없음
    if (materialsOnly) {
      return {
        chapter,
        videos,
        completed: false,
        unlocked: true,
        overridden,
        materialsOnly: true,
      };
    }

    const completed = videos.every((v) => v.completed);
    const unlocked = prevCompleted || overridden;
    prevCompleted = completed; // 영상 챕터만 체인을 진행시킴
    return { chapter, videos, completed, unlocked, overridden, materialsOnly: false };
  });
}

export interface ChapterForStudent {
  item: StudentChapter;
  materials: Material[];
  locked: boolean;
}

// 플레이어 페이지용: 챕터 + 영상(진도) + 자료 + 잠금 상태
export async function getChapterForStudent(
  studentId: string,
  chapterId: string,
): Promise<ChapterForStudent | null> {
  const list = await getStudentChapters(studentId);
  const item = list.find((c) => c.chapter.id === chapterId);
  if (!item) return null;

  const db = getServiceClient();
  const { data: materials } = await db
    .from("materials")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("position", { ascending: true });

  return {
    item,
    materials: (materials as Material[]) ?? [],
    locked: !item.unlocked,
  };
}

export interface VideoAccess {
  video: Video;
  chapterId: string;
  progress: VideoProgress | null;
  locked: boolean; // 소속 챕터가 잠겨 있으면 true
}

// 진도 API용: 영상이 속한 챕터의 잠금 상태 확인
export async function getVideoAccess(
  studentId: string,
  videoId: string,
): Promise<VideoAccess | null> {
  const db = getServiceClient();
  const { data: video } = await db
    .from("videos")
    .select("*")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) return null;

  const list = await getStudentChapters(studentId);
  const chapter = list.find((c) => c.chapter.id === video.chapter_id);

  const { data: progress } = await db
    .from("video_progress")
    .select("*")
    .eq("student_id", studentId)
    .eq("video_id", videoId)
    .maybeSingle();

  return {
    video: video as Video,
    chapterId: video.chapter_id,
    progress: (progress as VideoProgress) ?? null,
    // 챕터가 목록에 없으면(비공개 등) 잠금 처리
    locked: !chapter || !chapter.unlocked,
  };
}
