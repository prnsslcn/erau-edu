import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function StudentLoginPage() {
  return (
    <AuthForm
      title="학생 로그인"
      subtitle="전화번호와 비밀번호 4자리로 로그인하세요."
      endpoint="/api/auth/student/login"
      redirectTo="/learn"
      submitLabel="Login"
      fields={[
        {
          name: "phone",
          label: "Phone",
          icon: "phone",
          inputMode: "tel",
          autoComplete: "username",
        },
        {
          name: "password",
          label: "Password (4 digits)",
          type: "password",
          icon: "lock",
          inputMode: "numeric",
          maxLength: 4,
          autoComplete: "current-password",
        },
      ]}
      footer={
        <span className="text-slate-500">
          처음이신가요?{" "}
          <Link href="/signup" className="font-semibold text-brand">
            Sign Up
          </Link>
        </span>
      }
    />
  );
}
