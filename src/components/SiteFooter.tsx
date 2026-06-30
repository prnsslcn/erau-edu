// 전역 푸터 — 브랜드 + 독립 운영 면책 문구 (ERAU 공식 사이트 아님)
export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-slate-200/70 px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-3 text-center sm:text-left">
        <p className="font-display text-sm tracking-tight">
          <span className="font-extrabold text-slate-700">ERAU</span>
          <span className="font-light text-slate-500"> Pathway Program</span>
        </p>
        <p className="mx-auto max-w-3xl text-xs leading-relaxed text-slate-400 sm:mx-0">
          This program is operated independently in Korea to support students
          preparing for Embry-Riddle Aeronautical University and aviation
          careers. It is not an official website of Embry-Riddle Aeronautical
          University.
        </p>
        <p className="text-xs text-slate-400">
          © {year} ERAU Pathway Program · eraukorea.com
        </p>
      </div>
    </footer>
  );
}
