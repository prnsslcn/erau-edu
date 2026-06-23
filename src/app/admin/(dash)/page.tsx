import Link from "next/link";
import { getDashboardSummary } from "@/lib/db/progress";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { totalChapters, rows } = await getDashboardSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">진도 대시보드</h1>
        <p className="mt-1 text-sm text-black/55">
          등록 학생 {rows.length}명 · 공개 강의 {totalChapters}개
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-black/45">
          아직 가입한 학생이 없습니다.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/8 bg-black/[.02] text-left text-xs text-black/50">
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
                  className="border-b border-black/5 last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{r.student.name}</td>
                  <td className="px-4 py-3 text-black/55">{r.student.phone}</td>
                  <td className="px-4 py-3 text-black/55">
                    {r.completedCount} / {r.totalChapters}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/8">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${r.percent}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-black/55">
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
