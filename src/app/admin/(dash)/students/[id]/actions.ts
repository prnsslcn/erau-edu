"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase";
import { requireRole } from "@/lib/auth/session";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// 교수진이 특정 학생의 특정 강의 잠금을 수동 해제/되돌리기.
// progress 행이 없으면 생성하고, 있으면 unlocked_override만 갱신(진도 보존).
export async function setChapterUnlock(
  studentId: string,
  chapterId: string,
  unlocked: boolean,
): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };

  const db = getServiceClient();
  const { error } = await db.from("progress").upsert(
    {
      student_id: studentId,
      chapter_id: chapterId,
      unlocked_override: unlocked,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,chapter_id" },
  );

  if (error) {
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin");
  revalidatePath("/learn");
  return { ok: true };
}
