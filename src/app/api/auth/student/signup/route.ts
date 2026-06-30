import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth/password";
import { studentSignupSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = studentSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요" },
      { status: 400 },
    );
  }

  const { name, phone, password } = parsed.data;
  const db = getServiceClient();

  // 전화번호 중복 확인
  const { data: existing } = await db
    .from("students")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "이미 가입된 전화번호입니다. 로그인해 주세요." },
      { status: 409 },
    );
  }

  const password_hash = await hashPassword(password);
  // 승인 대기 상태로 생성 (approved 기본값 false). 세션은 발급하지 않음.
  const { data: created, error } = await db
    .from("students")
    .insert({ name, phone, password_hash })
    .select("id")
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: "가입 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    pending: true,
    message:
      "가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
  });
}
