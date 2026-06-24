"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className={
        className ??
        "text-xl font-medium text-slate-500 transition hover:text-slate-800 disabled:opacity-50"
      }
    >
      {loading ? "…" : "Logout"}
    </button>
  );
}
