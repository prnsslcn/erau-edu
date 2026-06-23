import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function StudentSignupPage() {
  return (
    <AuthForm
      title="학생 회원가입"
      subtitle="이름, 전화번호, 비밀번호 4자리만 입력하면 됩니다."
      endpoint="/api/auth/student/signup"
      redirectTo="/learn"
      submitLabel="가입하고 시작하기"
      fields={[
        {
          name: "name",
          label: "이름",
          placeholder: "홍길동",
          autoComplete: "name",
        },
        {
          name: "phone",
          label: "전화번호",
          inputMode: "tel",
          placeholder: "01012345678",
          autoComplete: "username",
        },
        {
          name: "password",
          label: "비밀번호 (숫자 4자리)",
          type: "password",
          inputMode: "numeric",
          maxLength: 4,
          autoComplete: "new-password",
        },
      ]}
      footer={
        <span className="text-slate-500">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-semibold text-brand">
            로그인
          </Link>
        </span>
      }
    />
  );
}
