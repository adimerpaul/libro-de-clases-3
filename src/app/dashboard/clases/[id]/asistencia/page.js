import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { attendancePct, countStatuses, formatPct, parseBlock, parseDay, todayISO } from "@/lib/attendance";
import AttendanceSheet from "./_components/attendance-sheet";
import SlotPicker from "./_components/slot-picker";
import { studentListName } from "@/lib/catalog";

export const metadata = { title: "Asistencia · Libro de Clases 3.0" };

const longDate = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("es-CL", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });

export default async function AttendancePage({ params, searchParams }) {
  const { id } = await params;
  const { fecha, bloque } = await searchParams;
  const { user } = await requireSession();

  // Filtra por userId: un docente solo ve sus propias clases.
  const subject = await db.subject.findFirst({ where: { id: Number(id) || -1, userId: user.id } });
  if (!subject) notFound();

  const day = parseDay(fecha) ? fecha : todayISO();
  const date = parseDay(day);
  const block = parseBlock(bloque) ?? 1;

  const [students, session, recent] = await Promise.all([
    db.student.findMany({ where: { subjectId: subject.id }, orderBy: { listNumber: "asc" } }),
    db.attendanceSession.findUnique({
      where: { subjectId_date_block: { subjectId: subject.id, date, block } },
      include: { records: { where: { deletedAt: null } } },
    }),
    db.attendanceSession.findMany({
      where: { subjectId: subject.id },
      orderBy: [{ date: "desc" }, { block: "desc" }],
      take: 10,
      include: { records: { where: { deletedAt: null }, select: { status: true } } },
    }),
  ]);

  const marks = Object.fromEntries((session?.records ?? []).map((r) => [r.studentId, r.status]));
  const base = `/dashboard/clases/${subject.id}/asistencia`;

  return (
    <>
      <SlotPicker day={day} block={block} max={todayISO()} />

      <AttendanceSheet
        key={`${day}-${block}`}
        subjectId={subject.id}
        day={day}
        block={block}
        title={`${longDate.format(date)} · ${block}° bloque`}
        students={students.map((st) => ({
          id: st.id,
          listNumber: st.listNumber,
          name: studentListName(st),
          firstName: st.firstName,
          lastName: st.lastName,
          photo: st.photo,
        }))}
        initialMarks={marks}
        signedAt={session?.signedAt?.toISOString() ?? null}
      />

      <section className="flex flex-col gap-2 rounded-lg bg-neutral-100 p-3 shadow-sm">
        <h3 className="leading-tight font-semibold">Tomas recientes</h3>
        {recent.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-700">Todavía no hay asistencia registrada en esta clase.</p>
        ) : (
          <table className="w-full text-left text-[13px] leading-tight">
            <thead className="bg-neutral-200 text-xs text-neutral-700">
              <tr>
                <th className="px-2 py-1.5 font-semibold">Fecha</th>
                <th className="px-2 py-1.5 font-semibold">Bloque</th>
                <th className="px-2 py-1.5 font-semibold">P / T / A</th>
                <th className="px-2 py-1.5 font-semibold">Asistencia</th>
                <th className="px-2 py-1.5 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s) => {
                const c = countStatuses(s.records.map((r) => r.status));
                const iso = s.date.toISOString().slice(0, 10);
                const current = iso === day && s.block === block;
                return (
                  <tr key={s.id} className={`border-b border-neutral-200 ${current ? "bg-accent-100" : "hover:bg-accent-100/50"}`}>
                    <td className="px-2 py-1">
                      <Link href={`${base}?fecha=${iso}&bloque=${s.block}`} className="text-accent-700 hover:underline">
                        {shortDate.format(s.date).replaceAll("-", "/")}
                      </Link>
                    </td>
                    <td className="px-2 py-1">{s.block}°</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {c.P} / {c.T} / {c.A}
                    </td>
                    <td className="px-2 py-1">{formatPct(attendancePct(c))}</td>
                    <td className="px-2 py-1">
                      {s.signedAt ? (
                        <span className="rounded bg-accent-100 px-1.5 py-0.5 text-xs text-accent-800">Firmada</span>
                      ) : (
                        <span className="rounded bg-accent2-100 px-1.5 py-0.5 text-xs text-accent2-700">Sin firmar</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
