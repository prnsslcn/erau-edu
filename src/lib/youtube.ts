// 다양한 형태의 YouTube 입력에서 11자리 영상 ID를 추출합니다.
// 허용: 순수 ID, watch?v=, youtu.be/, embed/, shorts/

export function extractYouTubeId(input: string): string | null {
  const raw = input.trim();

  // 이미 순수 ID (11자, 영숫자/-/_)
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1, 12);
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      const m = url.pathname.match(/\/(embed|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // URL 아님
  }

  return null;
}
