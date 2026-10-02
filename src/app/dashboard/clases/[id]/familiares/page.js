import Link from "next/link";
import { notFound } from "next/navigation";
import { FirstAidKit, HouseLine, User, UserCircle, UsersThree } from "@phosphor-icons/react/ssr";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { FAMILY_BOOLEANS, FAMILY_TEXTS } from "@/lib/family";
import StudentAvatar from "../estudiantes/_components/student-avatar";
import EditFamilyButton from "./_components/family-form";
import { studentListName } from "@/lib/catalog";

export const metadata = { title: "Antecedentes familiares · Libro de Clases 3.0" };

const dateFmt = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

function fullName(st) {
  return [st.firstName, st.lastName, st.secondLastName].filter(Boolean).join(" ");
}

function Card({ icon: Icon, role, title, badge, rows }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-neutral-100 p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon weight="duotone" className="text-lg text-accent" />
        <span className="flex-1 text-[11px] tracking-widest text-neutral-700 uppercase">{role}</span>
        {badge && <span className="rounded bg-accent-100 px-1.5 py-0.5 text-xs text-accent-800">{badge}</span>}
      </div>
      <div className={`font-semibold ${title ? "" : "text-neutral-500"}`}>{title || "Sin registrar"}</div>
      <dl className="flex flex-col gap-1 text-[13px]">
        {rows.map(([k, val]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-28 flex-none text-neutral-700">{k}</dt>
            <dd className="min-w-0 break-words">{val || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function FamilyPage({ params, searchParams }) {
  const { id } = await params;
  const { estudiante } = await searchParams;
  const { user } = await requireSession();

  // Filtra por userId: un docente solo ve sus propias clases.
  const subject = await db.subject.findFirst({ where: { id: Number(id) || -1, userId: user.id } });
  if (!subject) notFound();

  const students = await db.student.findMany({ where: { subjectId: subject.id }, orderBy: { listNumber: "asc" } });
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg bg-neutral-100 py-10 text-center text-sm text-neutral-700 shadow-sm">
        <UsersThree weight="duotone" className="text-3xl text-accent" />
        Esta clase todavía no tiene estudiantes.
      </div>
    );
  }

  const selected = students.find((st) => st.id === Number(estudiante)) ?? students[0];
  const [record, filled] = await Promise.all([
    db.familyRecord.findUnique({ where: { studentId: selected.id } }),
    db.familyRecord.findMany({
      where: { studentId: { in: students.map((st) => st.id) }, guardianName: { not: null } },
      select: { studentId: true },
    }),
  ]);
  const withGuardian = new Set(filled.map((f) => f.studentId));
  const family = record
    ? Object.fromEntries([...FAMILY_TEXTS, ...FAMILY_BOOLEANS].map((k) => [k, record[k]]))
    : null;
  const f = family ?? {};
  const base = `/dashboard/clases/${subject.id}/familiares`;

  return (
    <div className="grid items-start gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav className="flex max-h-48 flex-col gap-px overflow-auto rounded-lg bg-neutral-100 p-1.5 shadow-sm lg:max-h-[calc(100vh-7rem)]">
        <div className="px-1.5 py-1 text-[11px] text-neutral-700">
          {withGuardian.size} de {students.length} con apoderado registrado
        </div>
        {students.map((st) => {
          const current = st.id === selected.id;
          return (
            <Link
              key={st.id}
              href={`${base}?estudiante=${st.id}`}
              aria-current={current ? "page" : undefined}
              className={`flex items-center gap-2 rounded px-1.5 py-1 text-[13px] leading-tight ${
                current ? "bg-accent-100 font-semibold" : "hover:bg-accent-100/50"
              }`}
            >
              <span className="w-5 flex-none text-right text-xs text-neutral-700">{st.listNumber}</span>
              <span className="flex-1 truncate">
                {studentListName(st)}
              </span>
              {!withGuardian.has(st.id) && (
                <span title="Sin apoderado registrado" className="size-1.5 flex-none rounded-full bg-accent2" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-neutral-100 p-3 shadow-sm">
          <StudentAvatar student={selected} size={56} />
          <div className="flex min-w-[200px] flex-1 flex-col leading-tight">
            <h3 className="text-lg font-semibold">{fullName(selected)}</h3>
            <span className="text-xs text-neutral-700">
              {[
                selected.rut && `RUN ${selected.rut}`,
                selected.birthDate && `Nacimiento ${dateFmt.format(selected.birthDate)}`,
                subject.course,
                `N° ${selected.listNumber}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          <EditFamilyButton key={selected.id} studentId={selected.id} studentName={fullName(selected)} family={family} />
        </div>

        {!family && (
          <p className="rounded bg-accent2-100 px-3 py-2 text-sm text-accent2-700">
            Aún no hay antecedentes familiares para este estudiante. Usa «Completar ficha» para registrarlos.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Card
            icon={UserCircle}
            role="Apoderado titular"
            badge={f.guardianName && "Titular"}
            title={f.guardianName}
            rows={[
              ["Parentesco", f.guardianRelation],
              ["Teléfono", f.guardianPhone && <a href={`tel:${f.guardianPhone}`} className="text-accent-700 hover:underline">{f.guardianPhone}</a>],
              ["Correo", f.guardianEmail && <a href={`mailto:${f.guardianEmail}`} className="text-accent-700 hover:underline">{f.guardianEmail}</a>],
              ["Ocupación", f.guardianOccupation],
            ]}
          />
          <Card
            icon={User}
            role="Apoderado suplente"
            title={f.substituteName}
            rows={[
              ["Parentesco", f.substituteRelation],
              ["Teléfono", f.substitutePhone && <a href={`tel:${f.substitutePhone}`} className="text-accent-700 hover:underline">{f.substitutePhone}</a>],
              ["Ocupación", f.substituteOccupation],
            ]}
          />
          <Card
            icon={HouseLine}
            role="Domicilio"
            title={f.address}
            rows={[
              ["Comuna", f.commune],
              ["Región", f.region],
              ["Vive con", f.livesWith],
            ]}
          />
          <Card
            icon={FirstAidKit}
            role="Salud y programas"
            title={family ? f.health || "Sin antecedentes" : null}
            rows={[
              ["Previsión", f.healthInsurance],
              ["Prioritario", family && (f.priority ? "Sí" : "No")],
              ["PIE", family && (f.pie ? "Sí" : "No")],
              ["Emergencia", f.emergencyPhone && <a href={`tel:${f.emergencyPhone}`} className="text-accent-700 hover:underline">{f.emergencyPhone}</a>],
            ]}
          />
        </div>
      </div>
    </div>
  );
}
