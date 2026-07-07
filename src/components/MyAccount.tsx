"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, UserX } from "lucide-react";
import { changeMyPassword, deleteMyAccount } from "@/app/learn/mypage/actions";

export default function MyAccount() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function onChangePw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    start(async () => {
      const res = await changeMyPassword(cur, next);
      if (res.ok) {
        setMsg("비밀번호가 변경되었습니다.");
        setCur("");
        setNext("");
      } else {
        setErr(res.error ?? "오류가 발생했습니다.");
      }
    });
  }

  function onDelete() {
    if (
      !confirm(
        "정말 탈퇴하시겠어요?\n계정과 수강 진도 기록이 모두 삭제되며 되돌릴 수 없습니다.",
      )
    )
      return;
    start(async () => {
      const res = await deleteMyAccount();
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setErr(res.error ?? "탈퇴 처리 중 오류가 발생했습니다.");
      }
    });
  }

  const onlyDigits = (v: string) => v.replace(/\D/g, "");

  return (
    <div className="space-y-4">
      {/* 비밀번호 변경 */}
      <div className="neu-raised rounded-2xl p-5">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <KeyRound size={16} className="text-brand" /> 비밀번호 변경
        </p>
        <form
          onSubmit={onChangePw}
          className="flex flex-wrap items-end gap-2"
        >
          <div>
            <label className="mb-1 block text-xs text-slate-500">현재 4자리</label>
            <input
              value={cur}
              onChange={(e) => setCur(onlyDigits(e.target.value))}
              type="password"
              inputMode="numeric"
              maxLength={4}
              required
              className="neu-input w-28 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">새 4자리</label>
            <input
              value={next}
              onChange={(e) => setNext(onlyDigits(e.target.value))}
              type="password"
              inputMode="numeric"
              maxLength={4}
              required
              className="neu-input w-28 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending || cur.length !== 4 || next.length !== 4}
            className="neu-btn-primary px-4 py-2.5 text-sm disabled:opacity-60"
          >
            변경
          </button>
        </form>
        {msg && <p className="mt-2 text-sm text-emerald-600">{msg}</p>}
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </div>

      {/* 회원탈퇴 */}
      <div className="neu-raised rounded-2xl p-5">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <UserX size={16} className="text-red-500" /> 회원탈퇴
        </p>
        <p className="mb-3 text-xs text-slate-500">
          계정과 수강 진도 기록이 모두 삭제되며 되돌릴 수 없습니다.
        </p>
        <button
          onClick={onDelete}
          disabled={pending}
          className="neu-btn px-4 py-2 text-sm text-red-500 disabled:opacity-60"
        >
          탈퇴하기
        </button>
      </div>
    </div>
  );
}
