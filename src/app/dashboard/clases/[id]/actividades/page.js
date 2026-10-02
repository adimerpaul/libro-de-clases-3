import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { todayISO } from "@/lib/attendance";
import { monthGrid, monthKey, parseMonth, shiftMonth } from "@/lib/activities";
import ActivityBoard from "./_components/activity-board";

export const metadata = { title: "Actividades · Libro de Clases 3.0" };

const monthFmt = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function ActivitiesPage({ params, searchParams }) {
  const { id } = await params;
  const { mes } = await searchParams;
  const { user } = await getSession();

  // Filtra por userId: un docente solo ve sus propias clases.
  const subject = await db.subject.findFirst({ where: { id: Number(id) || -1, userId: user.id } });
  if (!subject) notFound();

  const today = todayISO();
  const current = parseMonth(mes) ?? parseMonth(today.slice(0, 7));
  const cells = monthGrid(current);

  // Trae también los días de los meses vecinos que se ven en la grilla.
  const activities = await db.activity.findMany({
    where: {
      subjectId: subject.id,
      date: { gte: new Date(`${cells[0].iso}T00:00:00Z`), lte: new Date(`${cells.at(-1).iso}T00:00:00Z`) },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const prev = shiftMonth(current, -1);
  const next = shiftMonth(current, 1);
  const base = `/dashboard/clases/${subject.id}/actividades`;

  return (
    <ActivityBoard
      subjectId={subject.id}
      title={monthFmt.format(new Date(Date.UTC(current.year, current.month - 1, 1)))}
      cells={cells}
      today={today}
      prevHref={`${base}?mes=${monthKey(prev.year, prev.month)}`}
      nextHref={`${base}?mes=${monthKey(next.year, next.month)}`}
      todayHref={today.startsWith(monthKey(current.year, current.month)) ? null : base}
      activities={activities.map((a) => ({
        id: a.id,
        date: a.date.toISOString().slice(0, 10),
        title: a.title,
        kind: a.kind,
        detail: a.detail ?? "",
      }))}
    />
  );
}
