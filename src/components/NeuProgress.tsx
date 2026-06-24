// 뉴모피즘 진도바 — 안으로 파인 트랙 + 볼륨감 있는 파란 채움.
// 순수 표현용(서버/클라이언트 공용). 비즈니스 로직 없음.

export default function NeuProgress({
  percent,
  className = "h-3",
  tone = "blue",
}: {
  percent: number;
  className?: string;
  tone?: "blue" | "green";
}) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const fill = tone === "green" ? "bg-lime-400" : "bg-blue-500";

  return (
    <div
      className={`relative overflow-hidden rounded-full bg-slate-200 ${className}`}
    >
      <div
        className={`h-full rounded-full ${fill} transition-[width] duration-500 ease-out`}
        style={{ width: `${p}%` }}
      />
    </div>
  );
}
