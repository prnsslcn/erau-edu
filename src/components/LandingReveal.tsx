"use client";

import { useEffect, useRef, useState } from "react";

// 전체화면 라이트 패널이 뷰포트 끝에서 로그인 박스 위치/크기로 수축 →
// 박스 모양이 되면 내용물(children)을 페이드인.
export default function LandingReveal({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      el.style.opacity = "1";
      setRevealed(true);
      return;
    }

    // 자연 위치/크기 측정
    const r = el.getBoundingClientRect();
    const sx = window.innerWidth / r.width;
    const sy = window.innerHeight / r.height;

    // 박스를 전체화면 크기로 확대(좌상단 → 뷰포트 0,0)
    el.style.transformOrigin = "0 0";
    el.style.transform = `translate(${-r.left}px, ${-r.top}px) scale(${sx}, ${sy})`;
    el.style.transition = "none";
    el.style.opacity = "1";
    void el.offsetWidth; // reflow

    // 다음 프레임에 자연 크기로 수축 (시작~끝 고른 ease-in-out으로 천천히)
    const raf = requestAnimationFrame(() => {
      el.style.transition = "transform 1.4s cubic-bezier(0.65, 0, 0.35, 1)";
      el.style.transform = "none";
    });
    // 수축이 끝날 즈음 내용물 등장
    const t = window.setTimeout(() => setRevealed(true), 1350);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: 0, willChange: "transform" }}
    >
      <div className={revealed ? "landing-stagger" : "opacity-0"}>
        {children}
      </div>
    </div>
  );
}
