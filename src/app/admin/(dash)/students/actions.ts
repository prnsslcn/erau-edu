"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase";
import { requireRole } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { studentPasswordSchema } from "@/lib/validation";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// 학생 비밀번호 초기화 (4자리) — 학생이 PW 분실 시 복구 수단
export async function resetStudentPassword(
  studentId: string,
  newPassword: string,
): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  const parsed = studentPasswordSchema.safeParse(newPassword);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message };

  const db = getServiceClient();
  const password_hash = await hashPassword(parsed.data);
  const { error } = await db
    .from("students")
    .update({ password_hash })
    .eq("id", studentId);
  if (error) return { ok: false, error: "초기화 중 오류가 발생했습니다." };
  revalidatePath(`/admin/students/${studentId}`);
  return { ok: true };
}

// 접근 정지/해제 — 삭제 없이 로그인만 차단(정지) / 다시 허용(해제)
export async function setStudentAccess(
  studentId: string,
  active: boolean,
): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  const db = getServiceClient();
  // 정지: approved=false 로만 변경(approved_at은 유지 → 가입 대기와 구분됨)
  const { error } = await db
    .from("students")
    .update({ approved: active })
    .eq("id", studentId);
  if (error) return { ok: false, error: "처리 중 오류가 발생했습니다." };
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin");
  revalidatePath("/learn");
  return { ok: true };
}

// 강퇴 — 학생 계정 삭제 (진도·잠금은 FK cascade로 함께 삭제)
export async function deleteStudent(studentId: string): Promise<ActionResult> {
  if (!(await requireRole("admin"))) return { ok: false, error: "권한 없음" };
  const db = getServiceClient();
  const { error } = await db.from("students").delete().eq("id", studentId);
  if (error) return { ok: false, error: "삭제 중 오류가 발생했습니다." };
  revalidatePath("/admin");
  return { ok: true };
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
