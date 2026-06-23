import type { Metadata } from "next";
import "./globals.css";
import PlaneBackdrop from "@/components/PlaneBackdrop";

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
      <body className="relative min-h-full flex flex-col bg-slate-100">
        <PlaneBackdrop />
        {children}
      </body>
    </html>
  );
}
