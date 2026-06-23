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
      <header className="sticky top-0 z-10 border-b border-black/8 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <Link href="/learn" className="font-bold tracking-tight">
            ERAU 입학 전 교육
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-black/55">{session.name} 님</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</div>
    </>
  );
}
