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
        {/* 배경 깊이감 — 파스텔 블롭 */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-blue-200/30 blur-3xl" />
          <div className="absolute right-[-10rem] top-1/4 h-[26rem] w-[26rem] rounded-full bg-purple-200/30 blur-3xl" />
          <div className="absolute bottom-[-8rem] left-1/4 h-[24rem] w-[24rem] rounded-full bg-sky-200/30 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-indigo-200/20 blur-3xl" />
        </div>
        {children}
      </body>
    </html>
  );
}
