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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-4 sm:gap-12">
            <Link
              href="/admin"
              className="font-display text-xl font-extrabold tracking-tight sm:text-4xl"
            >
              ERAU EduPrep
            </Link>
            <nav className="flex items-center gap-3 text-sm sm:gap-8 sm:text-base">
              <Link href="/admin" className="text-slate-500 transition-colors hover:text-slate-900">
                Dashboard
              </Link>
              <Link
                href="/admin/chapters"
                className="text-slate-500 transition-colors hover:text-slate-900"
              >
                Courses
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {session.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</div>
    </>
  );
}
