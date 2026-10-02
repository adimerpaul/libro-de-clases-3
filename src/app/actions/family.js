"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { FAMILY_BOOLEANS, FAMILY_TEXTS } from "@/lib/family";

const MAX_TEXT = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s()-]{5,19}$/;

async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

// Crea o actualiza la ficha familiar de un estudiante de una clase del docente.
export async function saveFamily(prevState, formData) {
  const user = await requireUser();
  const student = await db.student.findFirst({
    where: { id: Number(formData.get("studentId")) || -1, subject: { userId: user.id, deletedAt: null } },
  });
  if (!student) return { error: "Estudiante no encontrado." };

  const values = {};
  const errors = {};
  for (const key of FAMILY_TEXTS) {
    values[key] = String(formData.get(key) ?? "").trim();
    if (values[key].length > MAX_TEXT) errors[key] = `Máximo ${MAX_TEXT} caracteres.`;
  }
  for (const key of FAMILY_BOOLEANS) values[key] = formData.get(key) === "on";

  if (values.guardianEmail && !EMAIL_RE.test(values.guardianEmail)) errors.guardianEmail = "Correo inválido.";
  for (const key of ["guardianPhone", "substitutePhone", "emergencyPhone"]) {
    if (values[key] && !PHONE_RE.test(values[key])) errors[key] = "Teléfono inválido.";
  }
  if (Object.keys(errors).length) return { values, errors };

  const data = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, typeof v === "string" ? v || null : v]),
  );
  await db.familyRecord.upsert({
    where: { studentId: student.id },
    create: { ...data, studentId: student.id },
    update: data,
  });

  revalidatePath(`/dashboard/clases/${student.subjectId}/familiares`);
  return { ok: true };
}
