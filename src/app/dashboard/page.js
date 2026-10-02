import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Compass, Function as FunctionIcon, Student } from "@phosphor-icons/react/ssr";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import CreateClassDialog from "./_components/create-class-dialog";

export const metadata = { title: "Mis clases · Libro de Clases 3.0" };

const SUBJECT_ICONS = { Matemática: FunctionIcon, Orientación: Compass };

export default async function DashboardPage() {
  const { user } = await getSession();

  const subjects = await db.subject.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      // Los conteos de relaciones no pasan por el filtro de soft delete de db.js.
      _count: { select: { students: { where: { deletedAt: null } } } },
    },
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-accent-800 p-8 text-neutral-100">
        <div className="min-w-[260px] flex-1">
          <h2 className="text-3xl font-semibold">Hola, {user.name}</h2>
          <p className="text-accent-200">Elige una de tus clases para trabajar o crea una nueva.</p>
        </div>
        <CreateClassDialog />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {subjects.map((s) => {
          const Icon = SUBJECT_ICONS[s.name] ?? BookOpen;
          return (
            <div key={s.id} className="flex flex-col gap-4 rounded-lg bg-neutral-100 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid size-11 flex-none place-items-center rounded-lg bg-accent-100 text-2xl text-accent-700">
                  <Icon weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-lg leading-tight font-semibold">{s.name}</div>
                  <div className="text-sm text-neutral-700">{s.course}</div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 text-sm text-neutral-700">
                <div className="flex items-start gap-1.5">
                  <Clock weight="duotone" className="mt-0.5 flex-none text-accent" />
                  {s.schedule || "Horario por definir"}
                </div>
                <div className="flex items-start gap-1.5">
                  <Student weight="duotone" className="mt-0.5 flex-none text-accent" />
                  {s._count.students} estudiantes
                </div>
              </div>
              <Link
                href={`/dashboard/clases/${s.id}`}
                className="mt-auto flex items-center justify-center gap-2 rounded bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-600"
              >
                Abrir clase
                <ArrowRight weight="duotone" />
              </Link>
            </div>
          );
        })}
        <CreateClassDialog variant="card" label="Crear nueva clase" />
      </div>
    </>
  );
}
