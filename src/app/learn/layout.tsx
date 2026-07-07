import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import LogoutButton from "@/components/LogoutButton";

export default async function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/login");

  return (
    <>
      <header className="neu-header sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
          <Link
            href="/learn"
            className="font-display text-lg tracking-tight sm:text-3xl"
          >
            <span className="font-extrabold text-slate-800">ERAU</span>
            <span className="font-light text-slate-500"> Pathway</span>
            <span className="hidden font-light text-slate-500 sm:inline">
              {" "}
              Program
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {session.name} 님
            </span>
            <Link
              href="/learn/mypage"
              className="text-base font-medium text-slate-500 transition hover:text-slate-800 disabled:opacity-50 sm:text-xl"
            >
              MyPage
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</div>
    </>
  );
}
