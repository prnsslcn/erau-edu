import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await getSession();
  if (session?.role === "student") redirect("/learn");
  if (session?.role === "admin") redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
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
            className="rounded-xl bg-brand px-6 py-3 text-[15px] font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:opacity-90 hover:shadow-blue-900/25"
          >
            학생 로그인
          </Link>
          <Link
            href="/signup"
            className="glass-panel rounded-xl px-6 py-3 text-[15px] font-semibold text-slate-700 transition hover:bg-white/60"
          >
            회원가입
          </Link>
        </div>

        <p className="mt-8 text-sm text-slate-400">
          교수진이신가요?{" "}
          <Link href="/admin/login" className="font-medium text-brand">
            관리자 로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
