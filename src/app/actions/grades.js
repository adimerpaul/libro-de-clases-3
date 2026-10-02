"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseGrade } from "@/lib/grades";

async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

// Todas las consultas se acotan a clases del docente de la sesión.
function ownedSubject(user, subjectId) {
  return db.subject.findFirst({ where: { id: Number(subjectId) || -1, userId: user.id } });
}

function ownedEvaluation(user, evaluationId) {
  return db.evaluation.findFirst({
    where: { id: Number(evaluationId) || -1, subject: { userId: user.id, deletedAt: null } },
  });
}

function refresh(subjectId) {
  revalidatePath(`/dashboard/clases/${subjectId}`, "layout"); // planilla + promedio del Resumen
}

function readEvaluation(formData) {
  const title = String(formData.get("title") ?? "").trim();
  const rawDate = String(formData.get("date") ?? "").trim();
  const errors = {};
  if (!title) errors.title = "Ponle un nombre (p. ej. Prueba Unidad 1).";
  else if (title.length > 60) errors.title = "Máximo 60 caracteres.";
  let date = null;
  if (rawDate) {
    date = new Date(`${rawDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) errors.date = "Fecha inválida.";
  }
  return { values: { title, date: rawDate }, data: { title, date }, errors };
}

// Crea (sin `id`) o edita (con `id`) una evaluación = una columna de la planilla.
export async function saveEvaluation(prevState, formData) {
  const user = await requireUser();
  const evaluationId = formData.get("id");

  const existing = evaluationId ? await ownedEvaluation(user, evaluationId) : null;
  const subject = await ownedSubject(user, existing?.subjectId ?? formData.get("subjectId"));
  if (!subject || (evaluationId && !existing)) return { error: "No tienes acceso a esta clase." };

  const { values, data, errors } = readEvaluation(formData);
  if (Object.keys(errors).length) return { values, errors };

  if (existing) {
    await db.evaluation.update({ where: { id: existing.id }, data });
  } else {
    const last = await db.evaluation.aggregate({
      where: { subjectId: subject.id },
      _max: { position: true },
    });
    await db.evaluation.create({
      data: { ...data, subjectId: subject.id, position: (last._max.position ?? 0) + 1 },
    });
  }

  refresh(subject.id);
  return { ok: true };
}

// Soft delete de la columna; sus notas quedan en la BD pero dejan de mostrarse y promediar.
export async function deleteEvaluation(prevState, formData) {
  const user = await requireUser();
  const evaluation = await ownedEvaluation(user, formData.get("id"));
  if (!evaluation) return { error: "No tienes acceso a esta evaluación." };

  await db.evaluation.delete({ where: { id: evaluation.id } });
  refresh(evaluation.subjectId);
  return { ok: true };
}

// Guarda (o borra, si viene vacía) la nota de un estudiante en una evaluación.
// Se llama desde la planilla al salir de cada celda; no revalida para no
// interrumpir la digitación (la planilla ya muestra el valor y los promedios).
export async function saveGrade({ evaluationId, studentId, raw }) {
  const user = await requireUser();
  const evaluation = await ownedEvaluation(user, evaluationId);
  if (!evaluation) return { error: "No tienes acceso a esta evaluación." };

  const student = await db.student.findFirst({
    where: { id: Number(studentId) || -1, subjectId: evaluation.subjectId },
  });
  if (!student) return { error: "El estudiante no pertenece a esta clase." };

  const parsed = parseGrade(raw);
  if (parsed.error) return { error: parsed.error };

  const key = { evaluationId: evaluation.id, studentId: student.id };
  if (parsed.value == null) {
    await db.grade.deleteMany({ where: key }); // soft delete vía db.js
  } else {
    // upsert también "revive" una nota borrada antes (misma fila por el índice único).
    await db.grade.upsert({
      where: { evaluationId_studentId: key },
      update: { value: parsed.value, deletedAt: null },
      create: { ...key, value: parsed.value },
    });
  }
  return { ok: true, value: parsed.value };
}
