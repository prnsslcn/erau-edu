import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
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
  const { data: created, error } = await db
    .from("students")
    .insert({ name, phone, password_hash })
    .select("id, name")
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: "가입 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  await createSession({ sub: created.id, role: "student", name: created.name });
  return NextResponse.json({ ok: true });
}
