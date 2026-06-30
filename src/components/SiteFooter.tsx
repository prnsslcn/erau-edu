"use client";

import { usePathname } from "next/navigation";

// 전역 푸터 — 브랜드 + 독립 운영 면책 문구 (ERAU 공식 사이트 아님)
// 가장자리에 붙지 않고 둥둥 떠 있는 둥근 뉴모피즘 카드(pill)
// 랜딩(/)에서는 화면 밖에서 슈욱 슬라이드인
export default function SiteFooter() {
  const year = new Date().getFullYear();
  const isLanding = usePathname() === "/";
  return (
    <footer
      className={`mt-auto px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-8 ${
        isLanding ? "animate-footer-slide" : ""
      }`}
    >
      <div className="neu-raised mx-auto max-w-7xl space-y-2.5 rounded-[2rem] px-8 py-6 text-center sm:px-12">
        <p className="font-display text-sm tracking-tight">
          <span className="font-extrabold text-slate-700">ERAU</span>
          <span className="font-light text-slate-500"> Pathway Program</span>
          <span className="text-xs font-normal text-slate-400">
            {" "}
            · © {year} · eraukorea.com
          </span>
        </p>
        <p className="whitespace-normal text-[11px] leading-relaxed text-slate-400 lg:whitespace-nowrap">
          This program is operated independently in Korea to support students
          preparing for Embry-Riddle Aeronautical University and aviation
          careers. It is not an official website of Embry-Riddle Aeronautical
          University.
        </p>
      </div>
    </footer>
  );
}
