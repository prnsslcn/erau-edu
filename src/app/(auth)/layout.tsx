import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

// 이미 로그인된 사용자는 각자 홈으로 보냅니다.
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session?.role === "student") redirect("/learn");
  if (session?.role === "admin") redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
