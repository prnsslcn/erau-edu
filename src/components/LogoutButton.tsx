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
        "text-sm font-medium text-black/55 transition hover:text-black/80 disabled:opacity-50"
      }
    >
      {loading ? "…" : "로그아웃"}
    </button>
  );
}
