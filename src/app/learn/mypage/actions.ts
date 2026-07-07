"use server";

import { getServiceClient } from "@/lib/supabase";
import { getSession, destroySession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { studentPasswordSchema } from "@/lib/validation";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// 본인 비밀번호 변경 (현재 PW 확인 → 새 4자리로 교체)
export async function changeMyPassword(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "student")
    return { ok: false, error: "로그인이 필요합니다." };

  const parsed = studentPasswordSchema.safeParse(newPassword);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message };

  const db = getServiceClient();
  const { data: student } = await db
    .from("students")
    .select("password_hash")
    .eq("id", session.sub)
    .maybeSingle();
  if (!student) return { ok: false, error: "계정을 찾을 수 없습니다." };

  const ok = await verifyPassword(currentPassword, student.password_hash);
  if (!ok) return { ok: false, error: "현재 비밀번호가 올바르지 않습니다." };

  const password_hash = await hashPassword(parsed.data);
  const { error } = await db
    .from("students")
    .update({ password_hash })
    .eq("id", session.sub);
  if (error) return { ok: false, error: "변경 중 오류가 발생했습니다." };
  return { ok: true };
}

// 회원탈퇴 (본인 계정 삭제 → 진도·잠금 cascade 삭제 → 세션 종료)
export async function deleteMyAccount(): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "student")
    return { ok: false, error: "로그인이 필요합니다." };

  const db = getServiceClient();
  const { error } = await db.from("students").delete().eq("id", session.sub);
  if (error) return { ok: false, error: "탈퇴 처리 중 오류가 발생했습니다." };

  await destroySession();
  return { ok: true };
}
