import "server-only";
import bcrypt from "bcryptjs";

// 폐쇄형 소수 그룹 + 4자리 PW + 로그인 횟수 제한 전제 → 비용을 낮춰 응답 속도 개선
// (기존 해시는 임베드된 비용으로 검증되므로 호환 문제 없음)
const ROUNDS = 8;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
