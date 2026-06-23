// 첫 교수진(Admin) 계정 시드 스크립트
//
// 사용법 (.env.local 채운 뒤):
//   node --env-file=.env.local scripts/seed-admin.mjs <email> <password> "<이름>"
// 예:
//   node --env-file=.env.local scripts/seed-admin.mjs prof@erau.edu 'Str0ng!pw' "박교수"
//
// 같은 이메일이 이미 있으면 비밀번호/이름을 갱신합니다(upsert).

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const [, , email, password, name] = process.argv;

if (!email || !password || !name) {
  console.error(
    'Usage: node --env-file=.env.local scripts/seed-admin.mjs <email> <password> "<이름>"',
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "환경변수 누락: .env.local 의 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 확인하세요.",
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("교수 비밀번호는 8자 이상을 권장합니다.");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const password_hash = await bcrypt.hash(password, 10);

const { data, error } = await db
  .from("admins")
  .upsert({ email, password_hash, name }, { onConflict: "email" })
  .select("id, email, name")
  .single();

if (error) {
  console.error("시드 실패:", error.message);
  process.exit(1);
}

console.log("✓ Admin 계정 생성/갱신 완료:", data);
