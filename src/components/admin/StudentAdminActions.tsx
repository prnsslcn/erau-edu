"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, KeyRound, Trash2, CircleCheck } from "lucide-react";
import {
  resetStudentPassword,
  setStudentAccess,
  deleteStudent,
} from "@/app/admin/(dash)/students/actions";

export default function StudentAdminActions({
  studentId,
  studentName,
  approved,
}: {
  studentId: string;
  studentName: string;
  approved: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function flash(setter: (v: string | null) => void, v: string) {
    setter(v);
    window.setTimeout(() => setter(null), 3000);
  }

  function onReset() {
    setErr(null);
    setMsg(null);
    start(async () => {
      const res = await resetStudentPassword(studentId, pw);
      if (res.ok) {
        flash(setMsg, `비밀번호를 "${pw}" 로 초기화했습니다.`);
        setPw("");
      } else {
        flash(setErr, res.error ?? "오류가 발생했습니다.");
      }
    });
  }

  function onToggleAccess() {
    setErr(null);
    setMsg(null);
    const next = !approved; // true=해제(활성), false=정지
    if (!next && !confirm(`"${studentName}" 학생의 접근을 정지할까요?`)) return;
    start(async () => {
      const res = await setStudentAccess(studentId, next);
      if (res.ok) router.refresh();
      else flash(setErr, res.error ?? "오류가 발생했습니다.");
    });
  }

  function onDelete() {
    setErr(null);
    if (
      !confirm(
        `"${studentName}" 학생을 강퇴(삭제)할까요?\n진도·잠금 기록이 함께 삭제되며 되돌릴 수 없습니다.`,
      )
    )
      return;
    start(async () => {
      const res = await deleteStudent(studentId);
      if (res.ok) router.push("/admin");
      else flash(setErr, res.error ?? "오류가 발생했습니다.");
    });
  }

  return (
    <div className="neu-raised space-y-4 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">관리</p>
          <p className="mt-0.5 text-xs text-slate-500">
            상태:{" "}
            {approved ? (
              <span className="text-emerald-600">활성</span>
            ) : (
              <span className="text-red-500">정지됨</span>
            )}
          </p>
        </div>
        <button
          onClick={onToggleAccess}
          disabled={pending}
          className="neu-btn flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-60"
        >
          {approved ? (
            <>
              <Ban size={15} className="text-red-500" /> 접근 정지
            </>
          ) : (
            <>
              <CircleCheck size={15} className="text-emerald-600" /> 정지 해제
            </>
          )}
        </button>
      </div>

      {/* 비밀번호 초기화 */}
      <div className="border-t border-slate-200 pt-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <KeyRound size={14} /> 비밀번호 초기화 (숫자 4자리)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={4}
            placeholder="새 4자리"
            className="neu-input w-32 text-sm"
          />
          <button
            onClick={onReset}
            disabled={pending || pw.length !== 4}
            className="neu-btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 강퇴 */}
      <div className="border-t border-slate-200 pt-4">
        <button
          onClick={onDelete}
          disabled={pending}
          className="neu-btn flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 disabled:opacity-60"
        >
          <Trash2 size={15} /> 강퇴 (계정 삭제)
        </button>
      </div>

      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
