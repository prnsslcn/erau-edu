import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await getSession();
  if (session?.role === "student") redirect("/learn");
  if (session?.role === "admin") redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="neu-raised w-full max-w-lg rounded-3xl p-10 text-center">
        <p className="text-sm font-semibold tracking-wide text-brand">
          EMBRY-RIDDLE 진학 준비
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          입학 전 온라인 교육 과정
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
          강의 영상을 순서대로 수강하고, 챕터를 완료하면 다음 강의가 열립니다.
          소속 학생을 위한 비공개 교육 페이지입니다.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="neu-btn-primary px-6 py-3 text-[15px]"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="neu-btn px-6 py-3 text-[15px]"
          >
            Sign Up
          </Link>
        </div>

        <p className="mt-8 text-sm text-slate-400">
          <Link href="/admin/login" className="font-medium text-brand">
            Admin
          </Link>
        </p>
      </div>
    </main>
  );
}
