import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERAU 입학 전 교육",
  description:
    "Embry-Riddle 진학 준비 학생을 위한 입학 전 온라인 교육 과정",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="relative min-h-full flex flex-col">
        {/* 배경 깊이감 — 진한 컬러 블롭 (유리 블러가 살아나도록) */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -left-20 top-10 h-96 w-96 rounded-full bg-blue-400/40 mix-blend-multiply blur-3xl" />
          <div className="absolute bottom-10 right-0 h-[28rem] w-[28rem] rounded-full bg-purple-400/40 mix-blend-multiply blur-3xl" />
          <div className="absolute left-1/3 top-1/2 h-96 w-96 rounded-full bg-teal-300/40 mix-blend-multiply blur-3xl" />
          <div className="absolute -right-16 top-1/4 h-80 w-80 rounded-full bg-pink-300/35 mix-blend-multiply blur-3xl" />
          <div className="absolute bottom-1/4 left-10 h-72 w-72 rounded-full bg-amber-200/40 mix-blend-multiply blur-3xl" />
        </div>
        {children}
      </body>
    </html>
  );
}
