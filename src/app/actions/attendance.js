"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseBlock, parseDay, STATUSES } from "@/lib/attendance";

async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

// Valida clase (del docente), día y bloque. Devuelve { subject, date, block } o { error }.
async function resolveSlot(subjectId, day, blockValue) {
  const user = await requireUser();
  const subject = await db.subject.findFirst({ where: { id: Number(subjectId) || -1, userId: user.id } });
  if (!subject) return { error: "No tienes acceso a esta clase." };
  const date = parseDay(day);
  if (!date) return { error: "Fecha inválida." };
  const block = parseBlock(blockValue);
  if (!block) return { error: "Bloque inválido." };
  return { subject, date, block };
}

function refresh(subjectId) {
  revalidatePath(`/dashboard/clases/${subjectId}`, "layout");
}

// Guarda marcas { [studentId]: "P" | "T" | "A" }. Crea la toma del día/bloque si no existe.
export async function markAttendance(subjectId, day, block, marks) {
  const slot = await resolveSlot(subjectId, day, block);
  if (slot.error) return slot;
  const { subject, date } = slot;

  const entries = Object.entries(marks ?? {}).map(([id, status]) => [Number(id), status]);
  if (!entries.length || entries.some(([, s]) => !STATUSES.includes(s))) return { error: "Marca inválida." };

  const ids = entries.map(([id]) => id);
  const valid = await db.student.count({ where: { id: { in: ids }, subjectId: subject.id } });
  if (valid !== ids.length) return { error: "Estudiante no pertenece a la clase." };

  const key = { subjectId_date_block: { subjectId: subject.id, date, block: slot.block } };
  const existing = await db.attendanceSession.findUnique({ where: key });
  if (existing?.signedAt) return { error: "Esta asistencia ya fue firmada." };

  await db.$transaction(async (tx) => {
    const session =
      existing ?? (await tx.attendanceSession.upsert({ where: key, create: key.subjectId_date_block, update: {} }));
    for (const [studentId, status] of entries) {
      await tx.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId: session.id, studentId } },
        create: { sessionId: session.id, studentId, status },
        update: { status },
      });
    }
  });

  refresh(subject.id);
  return { ok: true };
}

// Cierra la toma: exige a todos los estudiantes marcados y luego ya no se puede editar.
export async function signAttendance(subjectId, day, block) {
  const slot = await resolveSlot(subjectId, day, block);
  if (slot.error) return slot;
  const { subject, date } = slot;

  const session = await db.attendanceSession.findUnique({
    where: { subjectId_date_block: { subjectId: subject.id, date, block: slot.block } },
    include: { records: { where: { deletedAt: null }, select: { studentId: true } } },
  });
  if (!session) return { error: "Aún no hay marcas en esta toma." };
  if (session.signedAt) return { error: "Esta asistencia ya fue firmada." };

  const marked = new Set(session.records.map((r) => r.studentId));
  const students = await db.student.findMany({ where: { subjectId: subject.id }, select: { id: true } });
  const missing = students.filter((st) => !marked.has(st.id)).length;
  if (missing) return { error: `Faltan ${missing} estudiantes por marcar.` };

  await db.attendanceSession.update({ where: { id: session.id }, data: { signedAt: new Date() } });
  refresh(subject.id);
  return { ok: true };
}
