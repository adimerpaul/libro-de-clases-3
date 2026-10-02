import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import GradesSheet from "./_components/grades-sheet";
import { studentListName } from "@/lib/catalog";

export const metadata = { title: "Calificaciones · Libro de Clases 3.0" };

export default async function GradesPage({ params }) {
  const { id } = await params;
  const { user } = await requireSession();

  // Filtra por userId: un docente solo ve sus propias clases.
  const subject = await db.subject.findFirst({ where: { id: Number(id) || -1, userId: user.id } });
  if (!subject) notFound();

  const [students, evaluations] = await Promise.all([
    db.student.findMany({ where: { subjectId: subject.id }, orderBy: { listNumber: "asc" } }),
    db.evaluation.findMany({
      where: { subjectId: subject.id },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      // Los include de relaciones no pasan por el filtro de soft delete de db.js.
      include: { grades: { where: { deletedAt: null }, select: { studentId: true, value: true } } },
    }),
  ]);

  // { "evaluationId:studentId": nota }
  const grades = {};
  for (const ev of evaluations) {
    for (const g of ev.grades) grades[`${ev.id}:${g.studentId}`] = g.value;
  }

  return (
    <GradesSheet
      subjectId={subject.id}
      subjectName={subject.name}
      students={students.map((st) => ({
        id: st.id,
        listNumber: st.listNumber,
        name: studentListName(st),
      }))}
      evaluations={evaluations.map((ev) => ({
        id: ev.id,
        title: ev.title,
        date: ev.date ? ev.date.toISOString().slice(0, 10) : "",
      }))}
      grades={grades}
    />
  );
}
