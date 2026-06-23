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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <Link
            href="/learn"
            className="font-display text-2xl font-extrabold tracking-tight sm:text-4xl"
          >
            ERAU EduPrep
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{session.name} 님</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</div>
    </>
  );
}
