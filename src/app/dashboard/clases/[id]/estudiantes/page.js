import { notFound } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NewStudentButton } from "./_components/student-actions";
import StudentsTable from "./_components/students-table";

export const metadata = { title: "Estudiantes · Libro de Clases 3.0" };

export default async function SubjectStudentsPage({ params, searchParams }) {
  const { id } = await params;
  const { q = "" } = await searchParams;
  const { user } = await getSession();

  // Filtra por userId: un docente solo ve sus propias clases.
  const subject = await db.subject.findFirst({
    where: { id: Number(id) || -1, userId: user.id },
  });
  if (!subject) notFound();

  const all = await db.student.findMany({ where: { subjectId: subject.id }, orderBy: { listNumber: "asc" } });
  const query = q.trim().toLowerCase();
  const students = all.filter((st) => {
    if (!query) return true;
    const name = [st.firstName, st.lastName, st.secondLastName].join(" ").toLowerCase();
    return name.includes(query) || st.rut?.toLowerCase().includes(query);
  });

  return (
    <div className="flex min-h-0 flex-col gap-2 rounded-lg bg-neutral-100 p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <form className="relative max-w-[320px] min-w-[200px] flex-1">
          <MagnifyingGlass weight="duotone" className="absolute top-1/2 left-2 -translate-y-1/2 text-neutral-700" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o RUN"
            className="w-full rounded border border-neutral-300 bg-paper py-1 pr-2 pl-7 text-sm outline-none focus:border-accent"
          />
        </form>
        <span className="text-xs text-neutral-700">
          {query ? `${students.length} de ${all.length}` : all.length} estudiantes
        </span>
        <span className="hidden text-xs text-neutral-500 lg:inline">
          · Arrastra una foto sobre un estudiante para cambiarla
        </span>
        <div className="flex-1" />
        <NewStudentButton subjectId={subject.id} />
      </div>

      {students.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-700">
          {query
            ? "Ningún estudiante coincide con la búsqueda."
            : "Esta clase todavía no tiene estudiantes. Usa «Matricular» para agregar."}
        </p>
      ) : (
        <StudentsTable subjectId={subject.id} students={students} />
      )}
    </div>
  );
}
