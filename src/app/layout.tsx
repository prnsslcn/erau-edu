import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import SiteFooter from "@/components/SiteFooter";

// 영문 디스플레이 폰트 (aftc 프로젝트와 동일)
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.eraukorea.com"),
  title: "ERAU Pathway Program",
  description:
    "From Dream to Flight Deck. Embry-Riddle Aeronautical University 진학을 준비하는 학생을 위한 입학 전 온라인 교육 과정 (한국 독립 운영).",
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
      <body className="min-h-full flex flex-col bg-slate-100">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
