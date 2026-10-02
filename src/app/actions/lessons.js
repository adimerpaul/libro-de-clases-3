"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseBlock, parseDay } from "@/lib/attendance";

const MAX_TOPIC = 500;

async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

// La clase debe pertenecer al docente de la sesión.
async function ownedSubject(user, subjectId) {
  return db.subject.findFirst({ where: { id: Number(subjectId) || -1, userId: user.id } });
}

async function ownedLesson(user, lessonId) {
  return db.lesson.findFirst({
    where: { id: Number(lessonId) || -1, subject: { userId: user.id, deletedAt: null } },
  });
}

function refresh(subjectId) {
  revalidatePath(`/dashboard/clases/${subjectId}`, "layout"); // registro, resumen y contador del menú
}

// Crea o edita (si viene `id`) un registro de clase. Solo se editan clases sin firmar.
export async function saveLesson(prevState, formData) {
  const user = await requireUser();
  const text = (k) => String(formData.get(k) ?? "").trim();
  const values = { date: text("date"), block: text("block"), topic: text("topic") };

  const errors = {};
  const date = parseDay(values.date);
  if (!date) errors.date = "Fecha inválida (no puede ser futura).";
  const block = parseBlock(values.block);
  if (!block) errors.block = "Bloque inválido.";
  if (!values.topic) errors.topic = "Describe el objetivo y la actividad.";
  else if (values.topic.length > MAX_TOPIC) errors.topic = `Máximo ${MAX_TOPIC} caracteres.`;
  if (Object.keys(errors).length) return { values, errors };

  const lesson = formData.get("id") ? await ownedLesson(user, formData.get("id")) : null;
  if (formData.get("id") && !lesson) return { values, error: "Registro no encontrado." };
  if (lesson?.signedAt) return { values, error: "Esta clase ya fue firmada y no se puede editar." };

  const subject = await ownedSubject(user, lesson?.subjectId ?? formData.get("subjectId"));
  if (!subject) return { values, error: "No tienes acceso a esta clase." };

  const clash = await db.lesson.findFirst({
    where: { subjectId: subject.id, date, block, ...(lesson ? { id: { not: lesson.id } } : {}) },
  });
  if (clash) return { values, errors: { block: "Ya hay una clase registrada en ese día y bloque." } };

  const data = { date, block, topic: values.topic };
  if (lesson) await db.lesson.update({ where: { id: lesson.id }, data });
  else await db.lesson.create({ data: { ...data, subjectId: subject.id } });

  refresh(subject.id);
  return { ok: true };
}

// Firma la clase: queda cerrada y ya no se puede editar ni eliminar.
export async function signLesson(prevState, formData) {
  const user = await requireUser();
  const lesson = await ownedLesson(user, formData.get("id"));
  if (!lesson) return { error: "Registro no encontrado." };
  if (lesson.signedAt) return { error: "Esta clase ya fue firmada." };

  await db.lesson.update({ where: { id: lesson.id }, data: { signedAt: new Date() } });
  refresh(lesson.subjectId);
  return { ok: true };
}

export async function deleteLesson(prevState, formData) {
  const user = await requireUser();
  const lesson = await ownedLesson(user, formData.get("id"));
  if (!lesson) return { error: "Registro no encontrado." };
  if (lesson.signedAt) return { error: "Una clase firmada no se puede eliminar." };

  await db.lesson.delete({ where: { id: lesson.id } });
  refresh(lesson.subjectId);
  return { ok: true };
}
