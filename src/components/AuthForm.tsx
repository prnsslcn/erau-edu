"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  Lock,
  Mail,
  ArrowLeft,
  Check,
  type LucideIcon,
} from "lucide-react";
import { formatPhoneInput } from "@/lib/phone";

const ICONS: Record<string, LucideIcon> = {
  user: User,
  phone: Phone,
  lock: Lock,
  mail: Mail,
};

export interface AuthField {
  name: string;
  label: string;
  type?: string;
  icon?: keyof typeof ICONS;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
  autoComplete?: string;
  autoFormat?: "phone"; // 입력 중 하이픈 자동 삽입
}

interface Props {
  title: string;
  subtitle?: string;
  endpoint: string;
  fields: AuthField[];
  submitLabel: string;
  redirectTo: string;
  footer?: React.ReactNode;
}

export default function AuthForm({
  title,
  subtitle,
  endpoint,
  fields,
  submitLabel,
  redirectTo,
  footer,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다. 다시 시도하세요.");
        setLoading(false);
        return;
      }

      // 승인 대기(가입 신청) — 리다이렉트하지 않고 안내 화면 표시
      if (data.pending) {
        setDone(data.message ?? "신청이 접수되었습니다.");
        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("네트워크 오류입니다. 잠시 후 다시 시도하세요.");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="neu-raised rounded-3xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check size={26} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">가입 신청 완료</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
          {done}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/login" className="neu-btn-primary py-2.5 text-center text-[15px]">
            로그인 화면으로
          </Link>
          <Link
            href="/"
            className="neu-btn inline-flex items-center justify-center gap-1.5 py-2.5 text-sm text-slate-600"
          >
            <ArrowLeft size={16} />
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="neu-raised rounded-3xl p-8">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="mt-1.5 text-sm leading-snug text-slate-500">{subtitle}</p>
      )}

      <form onSubmit={onSubmit} className="mt-7 space-y-7">
        {fields.map((f) => {
          const Icon = ICONS[f.icon ?? "user"];
          return (
            <div
              key={f.name}
              className="group grid grid-cols-[10%_90%] items-center border-b-2 border-slate-300 transition-colors duration-300 focus-within:border-blue-500"
            >
              <div className="flex items-center justify-center text-slate-300 transition-colors duration-300 group-focus-within:text-blue-500">
                <Icon size={18} />
              </div>
              <div className="relative h-[48px]">
                <input
                  id={f.name}
                  name={f.name}
                  type={f.type ?? "text"}
                  inputMode={f.inputMode}
                  maxLength={f.maxLength}
                  autoComplete={f.autoComplete}
                  onChange={
                    f.autoFormat === "phone"
                      ? (e) => {
                          e.currentTarget.value = formatPhoneInput(
                            e.currentTarget.value,
                          );
                        }
                      : undefined
                  }
                  required
                  placeholder=" "
                  className="peer absolute inset-0 h-full w-full border-none bg-transparent px-3 pt-4 text-[1.05rem] text-slate-700 outline-none"
                />
                <label
                  htmlFor={f.name}
                  className="pointer-events-none absolute left-3 top-1.5 text-[13px] font-medium text-blue-500 transition-all duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[17px] peer-placeholder-shown:text-slate-400 peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-[13px] peer-focus:text-blue-500"
                >
                  {f.label}
                </label>
              </div>
            </div>
          );
        })}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="neu-btn-primary w-full py-2.5 text-[15px]"
        >
          {loading ? "Processing…" : submitLabel}
        </button>
      </form>

      {footer && <div className="mt-5 text-center text-sm">{footer}</div>}

      <div className="mt-5 flex justify-center">
        <Link
          href="/"
          className="neu-btn inline-flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600"
        >
          <ArrowLeft size={16} />
          Home
        </Link>
      </div>
    </div>
  );
}
