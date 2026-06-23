// 뉴모피즘 진도바 — 안으로 파인 트랙 + 볼륨감 있는 파란 채움.
// 순수 표현용(서버/클라이언트 공용). 비즈니스 로직 없음.

export default function NeuProgress({
  percent,
  className = "h-3",
}: {
  percent: number;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div
      className={`relative overflow-hidden rounded-full bg-slate-100 shadow-[inset_2px_2px_5px_#cbd5e1,inset_-2px_-2px_5px_#ffffff] ${className}`}
    >
      <div
        className="h-full rounded-full bg-blue-500 shadow-[1px_1px_3px_#94a3b8] transition-[width] duration-500 ease-out"
        style={{ width: `${p}%` }}
      />
    </div>
  );
}
