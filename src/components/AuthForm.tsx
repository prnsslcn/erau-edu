"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AuthField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
  autoComplete?: string;
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

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("네트워크 오류입니다. 잠시 후 다시 시도하세요.");
      setLoading(false);
    }
  }

  return (
    <div className="glass-panel rounded-3xl p-7">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="mt-1.5 text-sm leading-snug text-slate-500">{subtitle}</p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label
              htmlFor={f.name}
              className="mb-1.5 block text-sm font-medium text-slate-600"
            >
              {f.label}
            </label>
            <input
              id={f.name}
              name={f.name}
              type={f.type ?? "text"}
              inputMode={f.inputMode}
              maxLength={f.maxLength}
              autoComplete={f.autoComplete}
              placeholder={f.placeholder}
              required
              className="glass-input"
            />
          </div>
        ))}

        {error && (
          <p className="rounded-xl border border-red-200/60 bg-red-50/70 px-3 py-2 text-sm text-red-600 backdrop-blur-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand py-2.5 text-[15px] font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:opacity-90 hover:shadow-blue-900/25 disabled:opacity-50"
        >
          {loading ? "처리 중…" : submitLabel}
        </button>
      </form>

      {footer && <div className="mt-5 text-center text-sm">{footer}</div>}
    </div>
  );
}
