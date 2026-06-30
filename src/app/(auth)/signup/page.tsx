import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function StudentSignupPage() {
  return (
    <AuthForm
      title="학생 가입 신청"
      subtitle="이름, 전화번호, 비밀번호 4자리를 입력해 신청하면 관리자 승인 후 로그인할 수 있습니다."
      endpoint="/api/auth/student/signup"
      redirectTo="/login"
      submitLabel="가입 신청"
      fields={[
        {
          name: "name",
          label: "Name",
          icon: "user",
          autoComplete: "name",
        },
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
          autoComplete: "new-password",
        },
      ]}
      footer={
        <span className="text-slate-500">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-semibold text-brand">
            Login
          </Link>
        </span>
      }
    />
  );
}
