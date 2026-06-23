import "server-only";
import { getServiceClient } from "@/lib/supabase";
import type { Chapter, Progress } from "./types";

export type StudentChapterProgress = Pick<
  Progress,
  "watched_seconds" | "last_position" | "completed"
>;

export interface StudentChapter {
  chapter: Chapter;
  progress: StudentChapterProgress | null;
  completed: boolean;
  unlocked: boolean; // 첫 강의이거나 이전 강의 완료, 또는 교수진 수동 해제 시 true
  overridden: boolean; // 교수진이 수동으로 잠금 해제했는지
}

// 공개 챕터를 순서대로, 학생의 진도/잠금 상태와 함께 반환합니다.
export async function getStudentChapters(
  studentId: string,
): Promise<StudentChapter[]> {
  const db = getServiceClient();

  const [{ data: chapters }, { data: progress }] = await Promise.all([
    db
      .from("chapters")
      .select("*")
      .eq("is_published", true)
      .order("position", { ascending: true }),
    // 마이그레이션 전후 모두 안전하도록 전체 컬럼 조회
    db.from("progress").select("*").eq("student_id", studentId),
  ]);

  const progressByChapter = new Map(
    (progress ?? []).map((p) => [p.chapter_id, p]),
  );

  let prevCompleted = true; // 첫 강의는 항상 열림
  return ((chapters as Chapter[]) ?? []).map((chapter) => {
    const p = progressByChapter.get(chapter.id) ?? null;
    const completed = p?.completed ?? false;
    const overridden = p?.unlocked_override ?? false;
    const unlocked = prevCompleted || overridden;
    prevCompleted = completed;
    return { chapter, progress: p, completed, unlocked, overridden };
  });
}

// 플레이어 페이지용: 특정 챕터를 잠금 검사와 함께 반환.
// 잠겨 있으면 locked=true, 비공개/없으면 null.
export async function getChapterForStudent(
  studentId: string,
  chapterId: string,
): Promise<{ item: StudentChapter; locked: boolean } | null> {
  const list = await getStudentChapters(studentId);
  const item = list.find((c) => c.chapter.id === chapterId);
  if (!item) return null;
  return { item, locked: !item.unlocked };
}
