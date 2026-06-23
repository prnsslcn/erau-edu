// 글래스 진도바 — 진행도에 따라 파랑→청록→초록으로 부드럽게 변하는 글로우 막대.
// 순수 표현용(서버/클라이언트 공용). 비즈니스 로직 없음.

export default function GlassProgress({
  percent,
  className = "h-2",
}: {
  percent: number;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));

  // 그라데이션 전체 폭을 막대 외곽(=100%)에 맞춰, 채워진 만큼만 노출.
  // → p가 커질수록 선두 색이 초록 쪽으로 이동(부드러운 색 전환).
  const bgSize = p > 0 ? `${Math.round(10000 / p)}% 100%` : "100% 100%";

  return (
    <div
      className={`relative w-full overflow-hidden rounded-full bg-slate-200/50 ${className}`}
    >
      <div
        className="h-full rounded-full shadow-[0_0_12px_0] shadow-emerald-400/40 transition-[width] duration-500 ease-out"
        style={{
          width: `${p}%`,
          backgroundImage:
            "linear-gradient(to right, #3b82f6, #22d3ee, #34d399)",
          backgroundSize: bgSize,
        }}
      />
    </div>
  );
}
