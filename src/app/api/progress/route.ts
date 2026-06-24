import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth/session";
import { getVideoAccess } from "@/lib/db/learn";
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

  const { video_id, watched_seconds, last_position, duration } = parsed.data;
  const studentId = session.sub;

  // 잠긴 챕터의 클립에는 진도를 기록하지 않습니다.
  const access = await getVideoAccess(studentId, video_id);
  if (!access) {
    return NextResponse.json({ error: "클립을 찾을 수 없습니다." }, { status: 404 });
  }
  if (access.locked) {
    return NextResponse.json({ error: "아직 잠긴 강의입니다." }, { status: 403 });
  }

  const db = getServiceClient();
  const existing = access.progress;

  const mergedWatched = Math.max(existing?.watched_seconds ?? 0, watched_seconds);
  const alreadyCompleted = existing?.completed ?? false;
  const completedNow =
    alreadyCompleted || mergedWatched / duration >= COMPLETE_RATIO;

  const { error } = await db.from("video_progress").upsert(
    {
      student_id: studentId,
      video_id,
      watched_seconds: mergedWatched,
      last_position,
      completed: completedNow,
      completed_at:
        completedNow && !alreadyCompleted
          ? new Date().toISOString()
          : undefined,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,video_id" },
  );

  if (error) {
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }

  // 클립 길이가 비어 있으면 채워둠(진도율 계산용)
  if (access.video.duration_seconds == null) {
    await db
      .from("videos")
      .update({ duration_seconds: duration })
      .eq("id", video_id);
  }

  return NextResponse.json({
    ok: true,
    completed: completedNow,
    newlyCompleted: completedNow && !alreadyCompleted,
  });
}
