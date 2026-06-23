import "server-only";

// 프록시(Vercel) 뒤에서 클라이언트 IP를 추출합니다.
export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip");
}
