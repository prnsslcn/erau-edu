import "server-only";
import { getServiceClient } from "@/lib/supabase";
import type { Role } from "./session";

// DB 기반 로그인 횟수 제한 (서버리스에서도 안전).
// 같은 식별자(전화번호/이메일) 또는 같은 IP의 최근 실패 횟수로 차단합니다.

const WINDOW_MINUTES = 15;
const MAX_FAILS_PER_ID = 5; // 식별자당 15분 내 실패 허용치
const MAX_FAILS_PER_IP = 20; // IP당 15분 내 실패 허용치

export async function recordAttempt(args: {
  identifier: string;
  kind: Role;
  ip: string | null;
  success: boolean;
}): Promise<void> {
  const db = getServiceClient();
  await db.from("login_attempts").insert({
    identifier: args.identifier,
    kind: args.kind,
    ip: args.ip,
    success: args.success,
  });
}

export interface RateLimitResult {
  blocked: boolean;
  retryAfterMinutes: number;
}

export async function checkRateLimit(args: {
  identifier: string;
  ip: string | null;
}): Promise<RateLimitResult> {
  const db = getServiceClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { count: idFails } = await db
    .from("login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("identifier", args.identifier)
    .eq("success", false)
    .gte("attempted_at", since);

  if ((idFails ?? 0) >= MAX_FAILS_PER_ID) {
    return { blocked: true, retryAfterMinutes: WINDOW_MINUTES };
  }

  if (args.ip) {
    const { count: ipFails } = await db
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip", args.ip)
      .eq("success", false)
      .gte("attempted_at", since);

    if ((ipFails ?? 0) >= MAX_FAILS_PER_IP) {
      return { blocked: true, retryAfterMinutes: WINDOW_MINUTES };
    }
  }

  return { blocked: false, retryAfterMinutes: 0 };
}
