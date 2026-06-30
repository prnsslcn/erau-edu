"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import {
  approveStudent,
  rejectStudent,
} from "@/app/admin/(dash)/students/actions";

export interface PendingItem {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export default function PendingApprovals({ items }: { items: PendingItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function approve(id: string) {
    setBusyId(id);
    start(async () => {
      await approveStudent(id);
      setBusyId(null);
      router.refresh();
    });
  }

  function reject(id: string, name: string) {
    if (!confirm(`"${name}" 가입 신청을 거절(삭제)할까요?`)) return;
    setBusyId(id);
    start(async () => {
      await rejectStudent(id);
      setBusyId(null);
      router.refresh();
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="neu-raised rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <UserCheck size={18} className="text-brand" />
        <h2 className="font-semibold text-slate-700">
          가입 승인 대기
          <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
            {items.length}
          </span>
        </h2>
      </div>

      <ul className="space-y-2">
        {items.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-200/40 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-700">{s.name}</p>
              <p className="text-xs text-slate-500">
                {s.phone} · 신청 {s.created_at.slice(0, 10)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => approve(s.id)}
                disabled={pending && busyId === s.id}
                className="neu-btn-primary px-4 py-1.5 text-sm disabled:opacity-60"
              >
                승인
              </button>
              <button
                onClick={() => reject(s.id, s.name)}
                disabled={pending && busyId === s.id}
                className="neu-btn px-4 py-1.5 text-sm text-red-500 disabled:opacity-60"
              >
                거절
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
