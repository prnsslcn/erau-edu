"use client";

import { useEffect, useRef, useState } from "react";

// 전체화면(고정 오버레이)이 뷰포트 끝에서 로그인 박스 위치/크기로 수축 →
// 박스 모양이 되면 본체 내용물(children)을 물방울 stagger로 등장.
// 오버레이는 position:fixed라 main의 overflow-hidden에 클리핑되지 않고 전체 뷰포트를 사용.
// WAAPI 사용 → 클라이언트 네비게이션(로그아웃 등) 재렌더와 무관하게 동작.
export default function LandingReveal({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [collapsing, setCollapsing] = useState(true); // 오버레이 표시 여부

  useEffect(() => {
    const box = boxRef.current;
    const ov = overlayRef.current;
    if (!box) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const r = box.getBoundingClientRect();
    if (reduce || !ov || r.width === 0 || r.height === 0) {
      setRevealed(true);
      setCollapsing(false);
      return;
    }

    // 오버레이를 박스 자연 크기/위치에 맞춤
    ov.style.inset = "auto";
    ov.style.left = `${r.left}px`;
    ov.style.top = `${r.top}px`;
    ov.style.width = `${r.width}px`;
    ov.style.height = `${r.height}px`;
    ov.style.transformOrigin = "0 0";

    const sx = window.innerWidth / r.width;
    const sy = window.innerHeight / r.height;

    // 전체 뷰포트 → 박스 자리로 수축
    const anim = ov.animate(
      [
        {
          transform: `translate(${-r.left}px, ${-r.top}px) scale(${sx}, ${sy})`,
        },
        { transform: "none" },
      ],
      {
        duration: 1400,
        easing: "cubic-bezier(0.65, 0, 0.35, 1)",
        fill: "both",
      },
    );

    let cancelled = false;
    anim.finished
      .then(() => {
        if (cancelled) return;
        setCollapsing(false); // 오버레이 제거
        setRevealed(true); // 본체 내용물 등장
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      anim.cancel();
    };
  }, []);

  return (
    <>
      <div ref={boxRef} className={className}>
        <div className={revealed ? "landing-stagger" : "opacity-0"}>
          {children}
        </div>
      </div>

      {collapsing && (
        <div
          ref={overlayRef}
          aria-hidden
          className={`pointer-events-none fixed z-50 ${className ?? ""}`}
          style={{ inset: 0, willChange: "transform" }}
        />
      )}
    </>
  );
}
