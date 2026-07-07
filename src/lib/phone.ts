// 휴대폰 번호 하이픈 처리.
// 저장은 숫자만(로그인 매칭 안정성), 화면 표시·입력은 하이픈.

// 표시용: 저장된 숫자열 → 010-1234-5678
export function formatPhone(raw: string | null | undefined): string {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return raw ?? "";
}

// 입력용: 타이핑 중 하이픈 자동 삽입 (최대 11자리, 3-4-4)
export function formatPhoneInput(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
