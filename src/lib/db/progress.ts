import "server-only";
import { getServiceClient } from "@/lib/supabase";
import type { Chapter, Student, Video, VideoProgress } from "./types";

export interface StudentProgressSummary {
  student: Pick<Student, "id" | "name" | "phone" | "created_at">;
  completedCount: number;
  totalChapters: number;
  percent: number;
}

// 챕터 완료 = 영상이 1개 이상이고 모두 완료된 경우
function chapterCompleted(
  videoIds: string[],
  completedVideoIds: Set<string>,
): boolean {
  return videoIds.length > 0 && videoIds.every((id) => completedVideoIds.has(id));
}

// 승인 대기 중인 가입 신청 학생
export interface PendingStudent {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export async function getPendingStudents(): Promise<PendingStudent[]> {
  const db = getServiceClient();
  const { data } = await db
    .from("students")
    .select("id, name, phone, created_at")
    .eq("approved", false)
    .order("created_at", { ascending: true });
  return (data ?? []) as PendingStudent[];
}

export async function getDashboardSummary(): Promise<{
  totalChapters: number;
  rows: StudentProgressSummary[];
}> {
  const db = getServiceClient();

  const [{ data: students }, { data: chapters }, { data: videos }, { data: progress }] =
    await Promise.all([
      db
        .from("students")
        .select("id, name, phone, created_at")
        .eq("approved", true)
        .order("created_at", { ascending: false }),
      db.from("chapters").select("id").eq("is_published", true),
      db.from("videos").select("id, chapter_id"),
      db.from("video_progress").select("student_id, video_id, completed"),
    ]);

  const publishedIds = new Set((chapters ?? []).map((c) => c.id));

  // 공개 챕터별 영상 id 목록 (영상이 있는 챕터만 = 진도 대상)
  const videoIdsByChapter = new Map<string, string[]>();
  for (const v of (videos ?? []) as Pick<Video, "id" | "chapter_id">[]) {
    if (!publishedIds.has(v.chapter_id)) continue;
    const arr = videoIdsByChapter.get(v.chapter_id) ?? [];
    arr.push(v.id);
    videoIdsByChapter.set(v.chapter_id, arr);
  }
  // 자료 전용 챕터는 진도에서 제외 → 분모는 영상 챕터 수
  const totalChapters = videoIdsByChapter.size;

  // 학생별 완료 영상 집합
  const completedByStudent = new Map<string, Set<string>>();
  for (const p of (progress ?? []) as Pick<
    VideoProgress,
    "student_id" | "video_id" | "completed"
  >[]) {
    if (!p.completed) continue;
    const set = completedByStudent.get(p.student_id) ?? new Set<string>();
    set.add(p.video_id);
    completedByStudent.set(p.student_id, set);
  }

  const rows: StudentProgressSummary[] = (
    (students ?? []) as Pick<Student, "id" | "name" | "phone" | "created_at">[]
  ).map((s) => {
    const done = completedByStudent.get(s.id) ?? new Set<string>();
    let completedCount = 0;
    for (const ids of videoIdsByChapter.values()) {
      if (chapterCompleted(ids, done)) completedCount++;
    }
    const percent =
      totalChapters > 0
        ? Math.round((completedCount / totalChapters) * 100)
        : 0;
    return { student: s, completedCount, totalChapters, percent };
  });

  return { totalChapters, rows };
}

export interface StudentDetailVideo {
  video: Video;
  watchedSeconds: number;
  pct: number;
  completed: boolean;
}

export interface StudentDetailChapter extends Chapter {
  videos: StudentDetailVideo[];
  completed: boolean;
  unlocked: boolean;
  overridden: boolean;
  naturallyUnlocked: boolean;
  materialsOnly: boolean;
}

export interface StudentDetail {
  student: Student;
  chapters: StudentDetailChapter[];
}

export async function getStudentDetail(
  studentId: string,
): Promise<StudentDetail | null> {
  const db = getServiceClient();

  const { data: student } = await db
    .from("students")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return null;

  const [{ data: chapters }, { data: videos }, { data: progress }, { data: unlocks }] =
    await Promise.all([
      db.from("chapters").select("*").order("position", { ascending: true }),
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

  const allChapters = (chapters as Chapter[]) ?? [];

  // 공개 챕터 순서대로 잠금 상태 계산
  const lockMap = new Map<
    string,
    { unlocked: boolean; overridden: boolean; naturallyUnlocked: boolean }
  >();
  let prevCompleted = true;
  for (const c of allChapters.filter((c) => c.is_published)) {
    const vids = videosByChapter.get(c.id) ?? [];
    const overridden = overrideByChapter.get(c.id) ?? false;
    // 자료 전용 챕터: 항상 열림, 잠금 체인 제외
    if (vids.length === 0) {
      lockMap.set(c.id, { unlocked: true, overridden, naturallyUnlocked: true });
      continue;
    }
    const completed = vids.every((v) => progressByVideo.get(v.id)?.completed);
    const naturallyUnlocked = prevCompleted;
    lockMap.set(c.id, {
      unlocked: naturallyUnlocked || overridden,
      overridden,
      naturallyUnlocked,
    });
    prevCompleted = completed;
  }

  const detailChapters: StudentDetailChapter[] = allChapters.map((c) => {
    const vids = videosByChapter.get(c.id) ?? [];
    const detailVideos: StudentDetailVideo[] = vids.map((video) => {
      const p = progressByVideo.get(video.id) ?? null;
      const dur = video.duration_seconds ?? 0;
      const pct =
        dur > 0 && p
          ? Math.min(100, Math.round((p.watched_seconds / dur) * 100))
          : 0;
      return {
        video,
        watchedSeconds: p?.watched_seconds ?? 0,
        pct,
        completed: p?.completed ?? false,
      };
    });
    const lock = lockMap.get(c.id);
    return {
      ...c,
      videos: detailVideos,
      completed: vids.length > 0 && detailVideos.every((v) => v.completed),
      unlocked: lock?.unlocked ?? false,
      overridden: lock?.overridden ?? false,
      naturallyUnlocked: lock?.naturallyUnlocked ?? false,
      materialsOnly: vids.length === 0,
    };
  });

  return { student: student as Student, chapters: detailChapters };
}
