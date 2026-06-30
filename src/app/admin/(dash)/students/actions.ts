"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase";
import { requireRole } from "@/lib/auth/session";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// 가입 신청 승인 → 로그인 허용
export async function approveStudent(studentId: string): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  const db = getServiceClient();
  const { error } = await db
    .from("students")
    .update({ approved: true, approved_at: new Date().toISOString() })
    .eq("id", studentId);
  if (error) return { ok: false, error: "승인 처리 중 오류가 발생했습니다." };
  revalidatePath("/admin");
  return { ok: true };
}

// 가입 신청 거절 → 미승인 학생 삭제(승인된 학생은 안전하게 제외)
export async function rejectStudent(studentId: string): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  const db = getServiceClient();
  const { error } = await db
    .from("students")
    .delete()
    .eq("id", studentId)
    .eq("approved", false);
  if (error) return { ok: false, error: "거절 처리 중 오류가 발생했습니다." };
  revalidatePath("/admin");
  return { ok: true };
}
