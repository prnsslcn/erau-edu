import "server-only";
import { getServiceClient } from "@/lib/supabase";
import type { Chapter, Progress, Student } from "./types";

export interface StudentProgressSummary {
  student: Pick<Student, "id" | "name" | "phone" | "created_at">;
  completedCount: number;
  totalChapters: number;
  percent: number;
}

// 대시보드용: 학생별 완료 챕터 수 / 진도율 요약.
// 공개된(is_published) 챕터만 분모로 계산합니다.
export async function getDashboardSummary(): Promise<{
  totalChapters: number;
  rows: StudentProgressSummary[];
}> {
  const db = getServiceClient();

  const [{ data: students }, { data: chapters }, { data: progress }] =
    await Promise.all([
      db
        .from("students")
        .select("id, name, phone, created_at")
        .order("created_at", { ascending: false }),
      db.from("chapters").select("id").eq("is_published", true),
      db.from("progress").select("student_id, chapter_id, completed"),
    ]);

  const publishedIds = new Set((chapters ?? []).map((c) => c.id));
  const totalChapters = publishedIds.size;

  // 학생별 완료 챕터 수 (공개 챕터만)
  const completedByStudent = new Map<string, number>();
  for (const p of (progress ?? []) as Pick<
    Progress,
    "student_id" | "chapter_id" | "completed"
  >[]) {
    if (p.completed && publishedIds.has(p.chapter_id)) {
      completedByStudent.set(
        p.student_id,
        (completedByStudent.get(p.student_id) ?? 0) + 1,
      );
    }
  }

  const rows: StudentProgressSummary[] = (
    (students ?? []) as Pick<
      Student,
      "id" | "name" | "phone" | "created_at"
    >[]
  ).map((s) => {
    const completedCount = completedByStudent.get(s.id) ?? 0;
    const percent =
      totalChapters > 0
        ? Math.round((completedCount / totalChapters) * 100)
        : 0;
    return { student: s, completedCount, totalChapters, percent };
  });

  return { totalChapters, rows };
}

export interface StudentDetailChapter extends Chapter {
  progress: Pick<
    Progress,
    "watched_seconds" | "last_position" | "completed" | "updated_at"
  > | null;
  unlocked: boolean; // 학생이 접근 가능한 상태인지 (공개 챕터 기준)
  overridden: boolean; // 교수진 수동 해제 여부
  naturallyUnlocked: boolean; // 이전 강의 완료로 자연스럽게 열린 상태인지
}

export interface StudentDetail {
  student: Student;
  chapters: StudentDetailChapter[];
}

// 학생 1명의 챕터별 진도 + 잠금 상태 상세.
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

  const [{ data: chapters }, { data: progress }] = await Promise.all([
    db.from("chapters").select("*").order("position", { ascending: true }),
    // 마이그레이션 전후 모두 안전하도록 전체 컬럼 조회
    db.from("progress").select("*").eq("student_id", studentId),
  ]);

  const progressByChapter = new Map(
    (progress ?? []).map((p) => [p.chapter_id, p]),
  );

  // 공개 챕터 순서대로 잠금 상태 계산 (학생이 실제 경험하는 시퀀스)
  const lockMap = new Map<
    string,
    { unlocked: boolean; overridden: boolean; naturallyUnlocked: boolean }
  >();
  let prevCompleted = true;
  for (const c of ((chapters as Chapter[]) ?? []).filter(
    (c) => c.is_published,
  )) {
    const p = progressByChapter.get(c.id);
    const overridden = p?.unlocked_override ?? false;
    const naturallyUnlocked = prevCompleted;
    lockMap.set(c.id, {
      unlocked: naturallyUnlocked || overridden,
      overridden,
      naturallyUnlocked,
    });
    prevCompleted = p?.completed ?? false;
  }

  return {
    student: student as Student,
    chapters: ((chapters as Chapter[]) ?? []).map((c) => {
      const lock = lockMap.get(c.id);
      return {
        ...c,
        progress: progressByChapter.get(c.id) ?? null,
        unlocked: lock?.unlocked ?? false,
        overridden: lock?.overridden ?? false,
        naturallyUnlocked: lock?.naturallyUnlocked ?? false,
      };
    }),
  };
}
