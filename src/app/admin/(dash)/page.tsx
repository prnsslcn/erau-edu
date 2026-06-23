import Link from "next/link";
import { getDashboardSummary } from "@/lib/db/progress";
import GlassProgress from "@/components/GlassProgress";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { totalChapters, rows } = await getDashboardSummary();

  const avgPercent =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.percent, 0) / rows.length)
      : 0;

  const kpis = [
    { label: "등록 학생", value: `${rows.length}`, unit: "명" },
    { label: "공개 강의", value: `${totalChapters}`, unit: "개" },
    { label: "평균 진도율", value: `${avgPercent}`, unit: "%" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">진도 대시보드</h1>
        <p className="mt-1 text-sm text-slate-500">
          학생별 수강 진행 현황을 한눈에 확인하세요.
        </p>
      </div>

      {/* KPI 카드 — 하나의 글래스 패널 안에 */}
      <div className="glass-panel rounded-3xl p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="glass-soft rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-2"
            >
              <p className="text-sm text-slate-500">{k.label}</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-slate-800">
                {k.value}
                <span className="ml-1 text-base font-medium text-slate-400">
                  {k.unit}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="glass-panel rounded-2xl p-8 text-center text-sm text-slate-400">
          아직 가입한 학생이 없습니다.
        </p>
      ) : (
        <div className="glass-panel overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/50 bg-white/30 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">전화번호</th>
                <th className="px-4 py-3 font-medium">완료</th>
                <th className="px-4 py-3 font-medium">진도율</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.student.id}
                  className="border-b border-white/30 transition-colors last:border-0 hover:bg-white/40"
                >
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {r.student.name}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.student.phone}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.completedCount} / {r.totalChapters}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <GlassProgress
                        percent={r.percent}
                        className="h-1.5 w-24"
                      />
                      <span className="text-xs tabular-nums text-slate-500">
                        {r.percent}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/students/${r.student.id}`}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      상세
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
