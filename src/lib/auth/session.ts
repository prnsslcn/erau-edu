import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// httpOnly 쿠키에 서명된 JWT로 세션을 담습니다.
// 학생/교수진 두 역할을 하나의 토큰 구조로 표현합니다.

export type Role = "student" | "admin";

export interface SessionPayload {
  sub: string; // 사용자 id (uuid)
  role: Role;
  name: string;
}

const COOKIE_NAME = "erau_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30일

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET 환경변수가 없습니다.");
  return new TextEncoder().encode(s);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.role !== "string") return null;
    return {
      sub: payload.sub,
      role: payload.role as Role,
      name: (payload.name as string) ?? "",
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function requireRole(role: Role): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || session.role !== role) return null;
  return session;
}
