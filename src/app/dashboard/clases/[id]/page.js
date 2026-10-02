import { notFound } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const metadata = { title: "Estudiantes · Libro de Clases 3.0" };

const dateFmt = new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeZone: "UTC" });

export default async function SubjectStudentsPage({ params, searchParams }) {
  const { id } = await params;
  const { q = "" } = await searchParams;
  const { user } = await getSession();

  // Filtra por userId: un docente solo ve sus propias clases.
  const subject = await db.subject.findFirst({
    where: { id: Number(id) || -1, userId: user.id },
  });
  if (!subject) notFound();

  const query = q.trim().toLowerCase();
  const students = (
    await db.student.findMany({ where: { subjectId: subject.id }, orderBy: { listNumber: "asc" } })
  ).filter((st) => {
    if (!query) return true;
    const name = [st.firstName, st.lastName, st.secondLastName].join(" ").toLowerCase();
    return name.includes(query) || st.rut?.toLowerCase().includes(query);
  });

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-neutral-100 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <form className="relative max-w-[360px] min-w-[220px] flex-1">
          <MagnifyingGlass
            weight="duotone"
            className="absolute top-1/2 left-2.5 -translate-y-1/2 text-neutral-700"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o RUT"
            className="w-full rounded border border-neutral-300 bg-paper py-2 pr-3 pl-8 outline-none focus:border-accent"
          />
        </form>
        <span className="text-sm text-neutral-700">{students.length} estudiantes</span>
      </div>

      {students.length === 0 ? (
        <p className="py-10 text-center text-neutral-700">
          {query ? "Ningún estudiante coincide con la búsqueda." : "Esta clase todavía no tiene estudiantes."}
        </p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-200 text-neutral-700">
              <tr>
                <th className="px-3 py-2 font-semibold">N°</th>
                <th className="px-3 py-2 font-semibold">Estudiante</th>
                <th className="px-3 py-2 font-semibold">RUN</th>
                <th className="px-3 py-2 font-semibold">Nacimiento</th>
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <tr key={st.id} className="border-b border-neutral-200">
                  <td className="px-3 py-2 text-neutral-700">{st.listNumber}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-[30px] flex-none place-items-center rounded-full bg-accent-100 text-[11px] font-semibold text-accent-800">
                        {st.firstName[0]}
                        {st.lastName[0]}
                      </span>
                      {st.firstName} {st.lastName} {st.secondLastName}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{st.rut ?? "—"}</td>
                  <td className="px-3 py-2">{st.birthDate ? dateFmt.format(st.birthDate) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
