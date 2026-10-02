"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ACTIVITY_KINDS } from "@/lib/activities";

async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

// La clase debe pertenecer al docente de la sesión.
async function ownedSubject(user, subjectId) {
  return db.subject.findFirst({ where: { id: Number(subjectId) || -1, userId: user.id } });
}

async function ownedActivity(user, activityId) {
  return db.activity.findFirst({
    where: { id: Number(activityId) || -1, subject: { userId: user.id, deletedAt: null } },
  });
}

function refresh(subjectId) {
  revalidatePath(`/dashboard/clases/${subjectId}`, "layout"); // calendario y próximas del resumen
}

function readFields(formData) {
  const text = (k) => String(formData.get(k) ?? "").trim();
  const values = { title: text("title"), kind: text("kind"), date: text("date"), detail: text("detail") };

  const errors = {};
  if (!values.title) errors.title = "Ingresa un título.";
  else if (values.title.length > 120) errors.title = "Máximo 120 caracteres.";
  if (!ACTIVITY_KINDS.includes(values.kind)) errors.kind = "Elige un tipo.";
  if (values.detail.length > 300) errors.detail = "Máximo 300 caracteres.";

  const date = new Date(`${values.date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) || Number.isNaN(date.getTime())) errors.date = "Fecha inválida.";

  const data = { title: values.title, kind: values.kind, date, detail: values.detail || null };
  return { values, data, errors };
}

// Crea (sin `id`) o actualiza (con `id`) una actividad.
export async function saveActivity(prevState, formData) {
  const user = await requireUser();
  const activityId = formData.get("id");

  const existing = activityId ? await ownedActivity(user, activityId) : null;
  const subject = await ownedSubject(user, existing?.subjectId ?? formData.get("subjectId"));
  if (!subject || (activityId && !existing)) return { error: "No tienes acceso a esta clase." };

  const { values, data, errors } = readFields(formData);
  if (Object.keys(errors).length) return { values, errors };

  if (existing) await db.activity.update({ where: { id: existing.id }, data });
  else await db.activity.create({ data: { ...data, subjectId: subject.id } });

  refresh(subject.id);
  return { ok: true };
}

export async function deleteActivity(prevState, formData) {
  const user = await requireUser();
  const activity = await ownedActivity(user, formData.get("id"));
  if (!activity) return { error: "No tienes acceso a esta actividad." };

  await db.activity.delete({ where: { id: activity.id } });
  refresh(activity.subjectId);
  return { ok: true };
}
