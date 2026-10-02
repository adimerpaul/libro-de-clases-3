import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDots,
  CheckSquareOffset,
  Clock,
  Exam,
  Notebook,
  Signature,
  Student,
  UsersThree,
} from "@phosphor-icons/react/ssr";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  attendancePct,
  countStatuses,
  formatPct,
  todayISO,
} from "@/lib/attendance";
import { KIND_STYLES } from "@/lib/activities";
import { average, formatGrade, isFailing } from "@/lib/grades";
import StudentAvatar from "./estudiantes/_components/student-avatar";

export const metadata = { title: "Resumen de la clase · Libro de Clases 3.0" };

const longDate = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Santiago",
});

const monthShort = new Intl.DateTimeFormat("es-CL", {
  month: "short",
  timeZone: "UTC",
});

// Edad cumplida a hoy; birthDate se guarda a medianoche UTC.
function ageOf(birthDate, now) {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = now.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birthDate.getUTCDate())) age--;
  return age;
}

function Card({ title, subtitle, action, children }) {
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-lg bg-neutral-100 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="leading-tight font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-neutral-700">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({ icon: Icon, label, value, note, tone = "accent" }) {
  const tones = {
    accent: "bg-accent-100 text-accent-700",
    neutral: "bg-neutral-200 text-neutral-700",
    accent2: "bg-accent2-100 text-accent2-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-lg bg-neutral-100 p-3 shadow-sm">
      <span
        className={`grid size-10 flex-none place-items-center rounded-full text-xl ${tones[tone]}`}
      >
        <Icon weight="duotone" />
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-xs text-neutral-700">{label}</span>
        <span className="text-2xl font-semibold">{value}</span>
        <span className="truncate text-[11px] text-neutral-700">{note}</span>
      </div>
    </div>
  );
}

const MODULES = [
  {
    icon: Notebook,
    label: "Registro de clases",
    desc: "Leccionario y firma de clases",
  },
  {
    icon: CheckSquareOffset,
    label: "Asistencia",
    desc: "Registro diario por bloque",
    path: "asistencia",
  },
  { icon: Exam, label: "Calificaciones", desc: "Notas y promedios", path: "calificaciones" },
  {
    icon: CalendarDots,
    label: "Actividades",
    desc: "Evaluaciones, reuniones y salidas",
    path: "actividades",
  },
  {
    icon: UsersThree,
    label: "Antecedentes familiares",
    desc: "Apoderados, domicilio y salud",
  },
];

export default async function SubjectSummaryPage({ params }) {
  const { id } = await params;
  const { user } = await getSession();

  // Filtra por userId: un docente solo ve sus propias clases.
  const subject = await db.subject.findFirst({
    where: { id: Number(id) || -1, userId: user.id },
  });
  if (!subject) notFound();

  const now = new Date();
  const monthStart = new Date(`${todayISO(now).slice(0, 7)}-01T00:00:00Z`);
  const [students, monthSessions, upcoming, evaluations, lessonCount, unsignedLessons] = await Promise.all([
    db.student.findMany({
      where: { subjectId: subject.id },
      orderBy: { listNumber: "asc" },
    }),
    db.attendanceSession.findMany({
      where: { subjectId: subject.id, date: { gte: monthStart } },
      include: {
        records: { where: { deletedAt: null }, select: { status: true } },
      },
    }),
    db.activity.findMany({
      where: {
        subjectId: subject.id,
        date: { gte: new Date(`${todayISO(now)}T00:00:00Z`) },
      },
      orderBy: { date: "asc" },
      take: 5,
    }),
    db.evaluation.findMany({
      where: { subjectId: subject.id },
      include: { grades: { where: { deletedAt: null }, select: { studentId: true, value: true } } },
    }),
    db.lesson.count({ where: { subjectId: subject.id } }),
    db.lesson.count({ where: { subjectId: subject.id, signedAt: null } }),
  ]);
  // Igual que la planilla: promedio de los promedios de cada estudiante.
  const studentAverages = students.map((st) =>
    average(evaluations.map((ev) => ev.grades.find((g) => g.studentId === st.id)?.value ?? null)),
  );
  const courseAvg = average(studentAverages);
  const failingCount = studentAverages.filter(isFailing).length;
  const monthPct = attendancePct(
    countStatuses(monthSessions.flatMap((s) => s.records.map((r) => r.status))),
  );

  const base = `/dashboard/clases/${subject.id}`;
  const ages = students
    .filter((st) => st.birthDate)
    .map((st) => ageOf(st.birthDate, now));
  const avgAge = ages.length
    ? (ages.reduce((a, b) => a + b, 0) / ages.length)
        .toFixed(1)
        .replace(".", ",")
    : null;
  const missingRut = students.filter((st) => !st.rut).length;
  const missingBirth = students.length - ages.length;
  const withPhoto = students.filter((st) => st.photo).length;
  const recent = [...students]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);
  const scheduleBlocks = (subject.schedule ?? "")
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);

  const pendingData = [
    missingRut > 0 && `${missingRut} sin RUN`,
    missingBirth > 0 && `${missingBirth} sin fecha de nacimiento`,
    students.length - withPhoto > 0 &&
      `${students.length - withPhoto} sin foto`,
  ].filter(Boolean);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-accent-800 px-4 py-3 text-neutral-100">
        <div className="min-w-[240px] flex-1">
          <h2 className="text-xl font-semibold">Hola, {user.name}</h2>
          <p className="text-sm text-accent-200 first-letter:uppercase">
            {subject.name} · {subject.course} · {longDate.format(now)}
          </p>
        </div>
        <Link
          href={`${base}/asistencia`}
          className="flex items-center gap-1.5 rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-accent-800 hover:bg-accent-100"
        >
          <CheckSquareOffset weight="duotone" className="text-lg" />
          Tomar asistencia
        </Link>
        <span
          title="Próximamente"
          className="flex cursor-not-allowed items-center gap-1.5 rounded border border-accent-200/50 px-3 py-1.5 text-sm opacity-60"
        >
          <Signature weight="duotone" className="text-lg" />
          Firmar clases
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2">
        <Kpi
          icon={Student}
          label="Estudiantes"
          value={students.length}
          note={
            avgAge ? `Edad promedio ${avgAge} años` : "Sin fechas de nacimiento"
          }
        />
        <Kpi
          icon={CheckSquareOffset}
          label="Asistencia del mes"
          value={formatPct(monthPct)}
          note={
            monthSessions.length
              ? `${monthSessions.length} ${monthSessions.length === 1 ? "toma" : "tomas"} este mes`
              : "Aún sin registros este mes"
          }
        />
        <Kpi
          icon={Exam}
          label="Promedio del curso"
          value={courseAvg == null ? "—" : formatGrade(courseAvg)}
          note={
            courseAvg == null
              ? "Aún sin calificaciones"
              : failingCount > 0
                ? `${failingCount} con promedio bajo 4,0`
                : `${evaluations.length} ${evaluations.length === 1 ? "evaluación" : "evaluaciones"}`
          }
          tone={courseAvg != null && isFailing(courseAvg) ? "accent2" : "neutral"}
        />
        <Kpi
          icon={Signature}
          label="Clases sin firmar"
          value={lessonCount ? unsignedLessons : "—"}
          note={
            lessonCount
              ? `De ${lessonCount} ${lessonCount === 1 ? "clase registrada" : "clases registradas"}`
              : "Aún sin clases registradas"
          }
          tone={unsignedLessons ? "accent2" : "neutral"}
        />
      </div>

      <div className="grid gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <Card
          title="Estudiantes"
          subtitle={
            pendingData.length
              ? `Datos por completar: ${pendingData.join(" · ")}`
              : "Nómina con datos completos"
          }
          action={
            <Link
              href={`${base}/estudiantes`}
              className="flex items-center gap-1 text-xs text-accent-700 hover:underline"
            >
              Ver lista
              <ArrowRight weight="duotone" />
            </Link>
          }
        >
          {students.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-700">
              Esta clase todavía no tiene estudiantes.{" "}
              <Link
                href={`${base}/estudiantes`}
                className="text-accent-700 hover:underline"
              >
                Matricular
              </Link>
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1">
                {students.map((st) => (
                  <span
                    key={st.id}
                    title={`${st.listNumber}. ${st.firstName} ${st.lastName}`}
                  >
                    <StudentAvatar student={st} size={30} />
                  </span>
                ))}
              </div>
              <div className="text-[11px] tracking-widest text-neutral-700 uppercase">
                Últimos matriculados
              </div>
              <ul className="flex flex-col">
                {recent.map((st) => (
                  <li
                    key={st.id}
                    className="flex items-center gap-2 border-b border-neutral-200 py-1 text-[13px]"
                  >
                    <StudentAvatar student={st} />
                    <span className="min-w-0 flex-1 truncate">
                      {st.lastName} {st.secondLastName}, {st.firstName}
                    </span>
                    <span className="text-xs text-neutral-700">
                      N° {st.listNumber}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-2">
          <Card
            title="Horario"
            subtitle={`${subject.name} · ${subject.course}`}
          >
            {scheduleBlocks.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-700">
                Horario por definir
              </p>
            ) : (
              <ul className="flex flex-col">
                {scheduleBlocks.map((block) => (
                  <li
                    key={block}
                    className="flex items-center gap-2 border-b border-neutral-200 py-1.5 text-[13px]"
                  >
                    <Clock weight="duotone" className="flex-none text-accent" />
                    {block}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Próximas actividades"
            action={
              <Link
                href={`${base}/actividades`}
                className="flex items-center gap-1 text-xs text-accent-700 hover:underline"
              >
                Calendario
                <ArrowRight weight="duotone" />
              </Link>
            }
          >
            {upcoming.length === 0 ? (
              <p className="py-4 text-center text-sm text-neutral-700">
                Sin actividades programadas.
              </p>
            ) : (
              <ul className="flex flex-col">
                {upcoming.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 border-b border-neutral-200 py-1.5"
                  >
                    <div className="w-9 flex-none text-center leading-none">
                      <div className="text-base font-semibold">
                        {a.date.getUTCDate()}
                      </div>
                      <div className="text-[10px] text-neutral-700 uppercase">
                        {monthShort.format(a.date).replace(".", "")}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-[13px]">{a.title}</div>
                      {a.detail && (
                        <div className="truncate text-xs text-neutral-700">
                          {a.detail}
                        </div>
                      )}
                    </div>
                    <span
                      className={`rounded-sm px-1 text-[11px] ${KIND_STYLES[a.kind]}`}
                    >
                      {a.kind}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card title="Libro de clases" subtitle="Módulos de esta clase">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
          {MODULES.map(({ icon: Icon, label, desc, path }) => {
            const content = (
              <>
                <span className="grid size-8 flex-none place-items-center rounded bg-accent-100 text-lg text-accent-700">
                  <Icon weight="duotone" />
                </span>
                <div className="min-w-0 leading-tight">
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-neutral-700">{desc}</div>
                </div>
              </>
            );
            const box =
              "flex items-start gap-2 rounded border border-neutral-200 p-2";
            return path ? (
              <Link
                key={label}
                href={`${base}/${path}`}
                className={`${box} hover:bg-accent-100`}
              >
                {content}
              </Link>
            ) : (
              <div
                key={label}
                title="Próximamente"
                className={`${box} cursor-not-allowed opacity-60`}
              >
                {content}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
