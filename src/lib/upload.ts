// 브라우저 → Supabase Storage 직접 업로드.
//
// 파일 바이트는 절대 서버 함수를 거치지 않는다.
// (Server Action 본문 상한 1MB / Vercel 함수 4.5MB·10초 제한을 우회하는 유일한 방법)
// 서버가 발급한 서명 URL에는 토큰이 들어 있어 별도 인증 헤더가 필요 없다.
// fetch 대신 XMLHttpRequest 를 쓰는 이유는 업로드 진행률(upload.onprogress) 때문이다.

export function putToSignedUrl(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`업로드에 실패했습니다 (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () =>
      reject(new Error("네트워크 오류로 업로드에 실패했습니다."));
    xhr.onabort = () => reject(new Error("업로드가 취소되었습니다."));

    xhr.send(file);
  });
}
