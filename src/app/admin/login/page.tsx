import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AuthForm from "@/components/AuthForm";

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.role === "admin") redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <AuthForm
          title="교수진 로그인"
          subtitle="관리자(교수진) 전용 페이지입니다."
          endpoint="/api/auth/admin/login"
          redirectTo="/admin"
          submitLabel="로그인"
          fields={[
            {
              name: "email",
              label: "이메일",
              type: "email",
              inputMode: "email",
              placeholder: "professor@example.com",
              autoComplete: "username",
            },
            {
              name: "password",
              label: "비밀번호",
              type: "password",
              autoComplete: "current-password",
            },
          ]}
        />
      </div>
    </main>
  );
}
