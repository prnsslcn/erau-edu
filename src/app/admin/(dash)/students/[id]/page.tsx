import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentDetail } from "@/lib/db/progress";
import StudentChapters from "@/components/admin/StudentChapters";
import StudentAdminActions from "@/components/admin/StudentAdminActions";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getStudentDetail(id);
  if (!detail) notFound();

  const { student, chapters } = detail;
  const completed = chapters.filter((c) => c.is_published && c.completed).length;
  const publishedCount = chapters.filter(
    (c) => c.is_published && !c.materialsOnly,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-brand hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {student.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {student.phone} · {completed} / {publishedCount} chapters done
        </p>
      </div>

      <StudentAdminActions
        studentId={student.id}
        studentName={student.name}
        approved={student.approved}
      />

      {chapters.length === 0 ? (
        <p className="neu-flat rounded-2xl p-8 text-center text-sm text-slate-400">
          등록된 챕터가 없습니다.
        </p>
      ) : (
        <StudentChapters studentId={student.id} chapters={chapters} />
      )}
    </div>
  );
}
