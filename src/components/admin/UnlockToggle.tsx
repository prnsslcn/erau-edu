"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setChapterUnlock } from "@/app/admin/(dash)/students/[id]/actions";

// 잠금 해제 버튼(잠긴 강의) / 되돌리기 버튼(수동 해제된 강의).
export default function UnlockToggle({
  studentId,
  chapterId,
  mode,
}: {
  studentId: string;
  chapterId: string;
  mode: "unlock" | "revert";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    start(async () => {
      const res = await setChapterUnlock(
        studentId,
        chapterId,
        mode === "unlock",
      );
      if (res.ok) router.refresh();
      else alert(res.error ?? "처리 중 오류가 발생했습니다.");
    });
  }

  const isUnlock = mode === "unlock";

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={
        isUnlock
          ? "shrink-0 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-90 disabled:opacity-50"
          : "shrink-0 rounded-xl border border-white/60 bg-white/40 px-3 py-1.5 text-xs font-medium text-slate-600 backdrop-blur-sm transition hover:bg-white/60 disabled:opacity-50"
      }
    >
      {pending ? "처리 중…" : isUnlock ? "🔓 잠금 해제" : "잠금 되돌리기"}
    </button>
  );
}
