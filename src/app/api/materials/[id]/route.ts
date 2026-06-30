import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth/session";
import { getStudentChapters } from "@/lib/db/learn";
import type { Material } from "@/lib/db/types";

// 다운로드 파일명 정제: "Lesson 04 · " 넘버링 제거 + 가운뎃점→하이픈(ASCII) + .pdf 보장
function downloadName(title: string): string {
  let name = title.replace(/^Lesson\b[^·]*·\s*/i, "").trim() || title;
  name = name
    .replace(/[·•]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!/\.pdf$/i.test(name)) name += ".pdf";
  return name;
}

// 자료 다운로드 — 권한 확인 후 60초 서명 URL로 리다이렉트.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const db = getServiceClient();
  const { data: material } = await db
    .from("materials")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!material) {
    return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
  }
  const mat = material as Material;

  // 학생은 해당 챕터가 열려 있어야 접근 가능 (관리자는 전체 허용)
  if (session.role === "student") {
    const chapters = await getStudentChapters(session.sub);
    const ch = chapters.find((c) => c.chapter.id === mat.chapter_id);
    if (!ch || !ch.unlocked) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }
  }

  const { data: signed, error } = await db.storage
    .from("materials")
    .createSignedUrl(mat.storage_path, 60, { download: downloadName(mat.title) });

  if (error || !signed) {
    return NextResponse.json({ error: "다운로드 링크 생성 실패" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
