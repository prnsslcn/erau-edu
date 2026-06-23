import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/admin/login");

  return (
    <>
      <header className="neu-header sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold tracking-tight">
              ERAU Edu · 관리자
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/admin" className="text-slate-500 transition-colors hover:text-slate-900">
                진도 대시보드
              </Link>
              <Link
                href="/admin/chapters"
                className="text-slate-500 transition-colors hover:text-slate-900"
              >
                강의 관리
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{session.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</div>
    </>
  );
}
