import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/request";
import { studentLoginSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = studentLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요" },
      { status: 400 },
    );
  }

  const { phone, password } = parsed.data;
  const ip = clientIp(req.headers);

  const limit = await checkRateLimit({ identifier: phone, ip });
  if (limit.blocked) {
    return NextResponse.json(
      {
        error: `로그인 시도가 많습니다. ${limit.retryAfterMinutes}분 후 다시 시도하세요.`,
      },
      { status: 429 },
    );
  }

  const db = getServiceClient();
  const { data: student } = await db
    .from("students")
    .select("id, name, password_hash")
    .eq("phone", phone)
    .maybeSingle();

  const ok = student
    ? await verifyPassword(password, student.password_hash)
    : false;

  await recordAttempt({ identifier: phone, kind: "student", ip, success: ok });

  if (!ok || !student) {
    return NextResponse.json(
      { error: "전화번호 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  await createSession({ sub: student.id, role: "student", name: student.name });
  return NextResponse.json({ ok: true });
}
