import "server-only";
import { createHash } from "node:crypto";

// Bunny Stream 연동 (서버 전용).
//
// API 키와 토큰 키는 절대 클라이언트로 나가면 안 된다.
// 브라우저에는 "서명 + 만료시각 + 영상 GUID"만 전달한다 — 키 자체는 서버에 남는다.
// (자료 PDF 업로드와 같은 티켓 방식. 목적지만 Supabase Storage → Bunny 로 바뀐 것)

const API_BASE = "https://video.bunnycdn.com";
const TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";
const EMBED_BASE = "https://iframe.mediadelivery.net/embed";

function env() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;
  const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME;
  if (!libraryId || !apiKey || !tokenKey || !cdnHostname) {
    throw new Error(
      "Bunny 환경변수가 없습니다. .env.local 의 BUNNY_STREAM_* 4개를 확인하세요.",
    );
  }
  return { libraryId, apiKey, tokenKey, cdnHostname };
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// ─────────────── 영상 객체 ───────────────

export interface BunnyVideo {
  guid: string;
  title: string;
  status: number; // 0 큐 / 1 업로드중 / 2 처리중 / 3 인코딩중 / 4 완료 / 5 실패
  length: number; // 초
  encodeProgress: number;
}

// 업로드 전에 Bunny 쪽에 "자리"를 만든다. 반환된 GUID 가 곧 asset_id.
export async function createBunnyVideo(title: string): Promise<string> {
  const { libraryId, apiKey } = env();
  const res = await fetch(`${API_BASE}/library/${libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Bunny 영상 생성 실패 (HTTP ${res.status})`);
  const data = (await res.json()) as { guid?: string };
  if (!data.guid) throw new Error("Bunny 응답에 guid가 없습니다.");
  return data.guid;
}

export async function getBunnyVideo(guid: string): Promise<BunnyVideo | null> {
  const { libraryId, apiKey } = env();
  const res = await fetch(`${API_BASE}/library/${libraryId}/videos/${guid}`, {
    headers: { AccessKey: apiKey, accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Bunny 영상 조회 실패 (HTTP ${res.status})`);
  return (await res.json()) as BunnyVideo;
}

export async function deleteBunnyVideo(guid: string): Promise<boolean> {
  const { libraryId, apiKey } = env();
  const res = await fetch(`${API_BASE}/library/${libraryId}/videos/${guid}`, {
    method: "DELETE",
    headers: { AccessKey: apiKey, accept: "application/json" },
  });
  return res.ok || res.status === 404;
}

// ─────────────── 업로드 티켓 (TUS) ───────────────

export interface BunnyUploadTicket {
  endpoint: string;
  videoId: string;
  libraryId: string;
  signature: string;
  expire: number;
}

// 브라우저가 TUS 로 직접 올릴 때 쓸 서명.
// signature = sha256(libraryId + apiKey + expire + videoId)
// → apiKey 는 해시 재료로만 쓰이고 브라우저로 나가지 않는다.
export function createBunnyUploadTicket(
  guid: string,
  ttlSeconds = 60 * 60 * 6, // 대용량 업로드를 감안해 넉넉히
): BunnyUploadTicket {
  const { libraryId, apiKey } = env();
  const expire = Math.floor(Date.now() / 1000) + ttlSeconds;
  return {
    endpoint: TUS_ENDPOINT,
    videoId: guid,
    libraryId,
    signature: sha256Hex(`${libraryId}${apiKey}${expire}${guid}`),
    expire,
  };
}

// ─────────────── 재생 URL ───────────────

// Embed View Token Authentication 용 서명 URL.
// token = sha256(tokenKey + videoId + expires)
export function signedEmbedUrl(guid: string, ttlSeconds = 60 * 60 * 6): string {
  const { libraryId, tokenKey } = env();
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const token = sha256Hex(`${tokenKey}${guid}${expires}`);
  const params = new URLSearchParams({
    token,
    expires: String(expires),
    autoplay: "false",
    // 이어보기(setCurrentTime)가 동작하려면 미디어가 먼저 로드돼야 한다.
    // preload 는 true|false 만 받는다(auto/metadata/none 은 400).
    preload: "true",
  });
  return `${EMBED_BASE}/${libraryId}/${guid}?${params}`;
}

// 목록 썸네일용 (CDN 토큰 인증을 켜면 이쪽도 서명이 필요해진다 — 지금은 미사용)
export function thumbnailUrl(guid: string): string {
  const { cdnHostname } = env();
  return `https://${cdnHostname}/${guid}/thumbnail.jpg`;
}
