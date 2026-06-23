import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 서비스 롤 키를 쓰는 서버 전용 Supabase 클라이언트.
// RLS를 우회하므로 절대 클라이언트 번들에 포함되면 안 됩니다.
// ("server-only" import가 클라이언트 사용 시 빌드 에러를 발생시킵니다.)

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase 환경변수가 없습니다. .env.local 의 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 채우세요.",
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
