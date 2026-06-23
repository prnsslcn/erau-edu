import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth/session";
import { getChapterForStudent } from "@/lib/db/learn";
import { progressUpdateSchema } from "@/lib/validation";

const COMPLETE_RATIO = 0.9; // 전체의 90% 이상 시청 시 완료

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = progressUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { chapter_id, watched_seconds, last_position, duration } = parsed.data;
  const studentId = session.sub;

  // 잠긴(미해제) 챕터에는 진도를 기록하지 않습니다.
  const found = await getChapterForStudent(studentId, chapter_id);
  if (!found) {
    return NextResponse.json({ error: "강의를 찾을 수 없습니다." }, { status: 404 });
  }
  if (found.locked) {
    return NextResponse.json({ error: "아직 잠긴 강의입니다." }, { status: 403 });
  }

  const db = getServiceClient();
  const existing = found.item.progress;

  // 시청 누적 초는 고점 유지(되감기로 줄지 않도록)
  const mergedWatched = Math.max(existing?.watched_seconds ?? 0, watched_seconds);
  const alreadyCompleted = existing?.completed ?? false;
  const completedNow =
    alreadyCompleted || mergedWatched / duration >= COMPLETE_RATIO;

  const { error } = await db.from("progress").upsert(
    {
      student_id: studentId,
      chapter_id,
      watched_seconds: mergedWatched,
      last_position,
      completed: completedNow,
      completed_at:
        completedNow && !alreadyCompleted
          ? new Date().toISOString()
          : undefined,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,chapter_id" },
  );

  if (error) {
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }

  // 챕터 길이가 비어 있으면 채워둠(대시보드 진도율 계산용)
  if (found.item.chapter.duration_seconds == null) {
    await db
      .from("chapters")
      .update({ duration_seconds: duration })
      .eq("id", chapter_id);
  }

  return NextResponse.json({
    ok: true,
    completed: completedNow,
    newlyCompleted: completedNow && !alreadyCompleted,
  });
}
