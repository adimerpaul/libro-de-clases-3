"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { normalizeRut } from "@/lib/catalog";
import { MAX_PHOTO_BYTES, photoToWebp, removePhoto, writePhoto } from "@/lib/photos";

async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

// La clase debe pertenecer al docente de la sesión.
async function ownedSubject(user, subjectId) {
  return db.subject.findFirst({ where: { id: Number(subjectId) || -1, userId: user.id } });
}

async function ownedStudent(user, studentId) {
  return db.student.findFirst({
    where: { id: Number(studentId) || -1, subject: { userId: user.id, deletedAt: null } },
  });
}

function refresh(subjectId) {
  revalidatePath(`/dashboard/clases/${subjectId}`, "layout"); // resumen y lista de estudiantes
  revalidatePath("/dashboard"); // conteo de estudiantes en las tarjetas
}

function readFields(formData) {
  const text = (k) => String(formData.get(k) ?? "").trim();
  const values = {
    firstName: text("firstName"),
    lastName: text("lastName"),
    secondLastName: text("secondLastName") || null,
    rut: text("rut"),
    birthDate: text("birthDate"),
  };

  const errors = {};
  if (!values.firstName) errors.firstName = "Ingresa los nombres.";
  if (!values.lastName) errors.lastName = "Ingresa el apellido paterno.";

  let rut = null;
  if (values.rut) {
    rut = normalizeRut(values.rut);
    if (!rut) errors.rut = "RUN inválido (revisa el dígito verificador).";
  }

  let birthDate = null;
  if (values.birthDate) {
    birthDate = new Date(`${values.birthDate}T00:00:00Z`);
    if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
      errors.birthDate = "Fecha inválida.";
    }
  }

  const data = {
    firstName: values.firstName,
    lastName: values.lastName,
    secondLastName: values.secondLastName,
    rut,
    birthDate,
  };
  return { values, data, errors };
}

// Valida y convierte la foto antes de tocar la BD. Devuelve { webp } o { error }.
async function readPhoto(formData) {
  const file = formData.get("photo");
  if (!file || typeof file === "string" || file.size === 0) return {};
  if (!file.type.startsWith("image/")) return { error: "El archivo debe ser una imagen." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "La foto no puede superar 5 MB." };
  try {
    return { webp: await photoToWebp(file) };
  } catch {
    return { error: "No se pudo leer la imagen. Prueba con JPG, PNG o WebP." };
  }
}

// Crea (sin `id`) o actualiza (con `id`) un estudiante, con foto opcional.
export async function saveStudent(prevState, formData) {
  const user = await requireUser();
  const studentId = formData.get("id");

  const existing = studentId ? await ownedStudent(user, studentId) : null;
  const subject = await ownedSubject(user, existing?.subjectId ?? formData.get("subjectId"));
  if (!subject || (studentId && !existing)) return { error: "No tienes acceso a esta clase." };

  const { values, data, errors } = readFields(formData);
  const photo = await readPhoto(formData);
  if (photo.error) errors.photo = photo.error;

  if (data.rut && !errors.rut) {
    const dup = await db.student.findFirst({
      where: { subjectId: subject.id, rut: data.rut, NOT: existing ? { id: existing.id } : undefined },
    });
    if (dup) errors.rut = "Ya hay un estudiante con este RUN en la clase.";
  }
  if (Object.keys(errors).length) return { values, errors };

  let student;
  if (existing) {
    student = await db.student.update({ where: { id: existing.id }, data });
  } else {
    const last = await db.student.aggregate({
      where: { subjectId: subject.id },
      _max: { listNumber: true },
    });
    student = await db.student.create({
      data: { ...data, subjectId: subject.id, listNumber: (last._max.listNumber ?? 0) + 1 },
    });
  }

  const removeCurrent = formData.get("removePhoto") === "on";
  if (photo.webp || removeCurrent) {
    const name = photo.webp ? await writePhoto(student.id, photo.webp) : null;
    await db.student.update({ where: { id: student.id }, data: { photo: name } });
    await removePhoto(existing?.photo);
  }

  refresh(subject.id);
  return { ok: true };
}

// Cambia o quita solo la foto (arrastrar una imagen sobre la fila, menú ⋮).
// Con `remove=on` la quita; si no, espera un archivo en `photo`.
export async function setStudentPhoto(formData) {
  const user = await requireUser();
  const student = await ownedStudent(user, formData.get("id"));
  if (!student) return { error: "No tienes acceso a este estudiante." };

  let name = null;
  if (formData.get("remove") !== "on") {
    const photo = await readPhoto(formData);
    if (photo.error) return { error: photo.error };
    if (!photo.webp) return { error: "No llegó ninguna imagen." };
    name = await writePhoto(student.id, photo.webp);
  }

  await db.student.update({ where: { id: student.id }, data: { photo: name } });
  await removePhoto(student.photo);
  refresh(student.subjectId);
  return { ok: true };
}

// Soft delete: la fila y su foto se conservan, solo se marca deletedAt.
export async function deleteStudent(prevState, formData) {
  const user = await requireUser();
  const student = await ownedStudent(user, formData.get("id"));
  if (!student) return { error: "No tienes acceso a este estudiante." };

  await db.student.delete({ where: { id: student.id } });
  refresh(student.subjectId);
  return { ok: true };
}
