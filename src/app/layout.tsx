import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

// 영문 디스플레이 폰트 (aftc 프로젝트와 동일)
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ERAU 입학 전 교육",
  description:
    "Embry-Riddle 진학 준비 학생을 위한 입학 전 온라인 교육 과정",
  // 폐쇄형 사이트 — 검색엔진 색인 차단
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-100">{children}</body>
    </html>
  );
}
