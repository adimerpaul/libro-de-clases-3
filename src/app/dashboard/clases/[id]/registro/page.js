import Link from "next/link";
import { notFound } from "next/navigation";
import { Notebook, SealCheck } from "@phosphor-icons/react/ssr";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { todayISO } from "@/lib/attendance";
import { LessonRowActions, NewLessonButton } from "./_components/lesson-actions";

export const metadata = { title: "Registro de clases · Libro de Clases 3.0" };

const shortDate = new Intl.DateTimeFormat("es-CL", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const stamp = new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" });

export default async function LessonsPage({ params }) {
  const { id } = await params;
  const { user } = await getSession();

  // Filtra por userId: un docente solo ve sus propias clases.
  const subject = await db.subject.findFirst({ where: { id: Number(id) || -1, userId: user.id } });
  if (!subject) notFound();

  const [lessons, sessions, studentCount] = await Promise.all([
    db.lesson.findMany({ where: { subjectId: subject.id }, orderBy: [{ date: "desc" }, { block: "desc" }] }),
    db.attendanceSession.findMany({
      where: { subjectId: subject.id },
      include: { records: { where: { deletedAt: null }, select: { status: true } } },
    }),
    db.student.count({ where: { subjectId: subject.id } }),
  ]);

  // Asistencia de la toma del mismo día y bloque: presentes + atrasados / marcados.
  const attendance = new Map(
    sessions.map((s) => [
      `${s.date.toISOString().slice(0, 10)}-${s.block}`,
      { present: s.records.filter((r) => r.status !== "A").length, total: s.records.length },
    ]),
  );

  const today = todayISO();
  const pending = lessons.filter((l) => !l.signedAt).length;
  const attendanceBase = `/dashboard/clases/${subject.id}/asistencia`;

  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-lg bg-neutral-100 p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <h3 className="font-semibold">{subject.name}</h3>
          <span className="text-xs text-neutral-700">
            {subject.course} · {subject.schedule || "Horario por definir"} · {lessons.length}{" "}
            {lessons.length === 1 ? "clase registrada" : "clases registradas"}
          </span>
        </div>
        {pending > 0 ? (
          <span className="rounded bg-accent2-100 px-1.5 py-0.5 text-xs text-accent2-700">{pending} sin firmar</span>
        ) : lessons.length > 0 ? (
          <span className="rounded bg-accent-100 px-1.5 py-0.5 text-xs text-accent-800">Todo firmado</span>
        ) : null}
        <NewLessonButton subjectId={subject.id} today={today} />
      </div>

      {lessons.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-10 text-center text-sm text-neutral-700">
          <Notebook weight="duotone" className="text-3xl text-accent" />
          Todavía no hay clases registradas. Usa «Registrar clase» para anotar el objetivo y la actividad del día.
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-left text-[13px] leading-tight">
            <thead className="bg-neutral-200 text-xs text-neutral-700">
              <tr>
                <th className="w-7" />
                <th className="px-2 py-1.5 font-semibold">Firma</th>
                <th className="px-2 py-1.5 font-semibold">Fecha</th>
                <th className="px-2 py-1.5 font-semibold">Bloque</th>
                <th className="px-2 py-1.5 font-semibold">Asist.</th>
                <th className="px-2 py-1.5 font-semibold">Objetivo / actividad</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((l) => {
                const iso = l.date.toISOString().slice(0, 10);
                const att = attendance.get(`${iso}-${l.block}`);
                return (
                  <tr key={l.id} className="border-b border-neutral-200 align-top hover:bg-accent-100/50">
                    <td className="w-7 py-1 pl-1">
                      {!l.signedAt && (
                        <LessonRowActions
                          subjectId={subject.id}
                          today={today}
                          label={`${longDate.format(l.date)} · ${l.block}° bloque`}
                          lesson={{ id: l.id, date: iso, block: l.block, topic: l.topic }}
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {l.signedAt ? (
                        <span
                          title={`Firmada el ${stamp.format(l.signedAt)}`}
                          className="inline-flex items-center gap-1 rounded bg-accent-100 px-1.5 py-0.5 text-xs text-accent-800"
                        >
                          <SealCheck weight="duotone" />
                          Firmada
                        </span>
                      ) : (
                        <span className="rounded bg-accent2-100 px-1.5 py-0.5 text-xs text-accent2-700">Sin firmar</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{shortDate.format(l.date)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-neutral-700">{l.block}° bloque</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <Link
                        href={`${attendanceBase}?fecha=${iso}&bloque=${l.block}`}
                        title={att ? "Ver asistencia" : "Tomar asistencia"}
                        className="text-accent-700 hover:underline"
                      >
                        {att?.total ? `${att.present}/${studentCount}` : "Tomar"}
                      </Link>
                    </td>
                    <td className="min-w-[240px] px-2 py-1.5 whitespace-pre-line">{l.topic}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
