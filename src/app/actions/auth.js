"use server";

import { redirect } from "next/navigation";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/hash";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { DEFAULT_SUBJECT, defaultStudents } from "@/lib/catalog";
import { seedDemoClass } from "@/lib/demo-data";
import { passwordError } from "@/lib/password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(prevState, formData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const errors = {};
  if (name.length < 3) errors.name = "Ingresa tu nombre completo.";
  if (!EMAIL_RE.test(email)) errors.email = "Ingresa un correo válido.";
  const pwError = passwordError(password);
  if (pwError) errors.password = pwError;
  if (password !== confirm) errors.confirm = "Las contraseñas no coinciden.";
  if (Object.keys(errors).length) return { name, email, errors };

  let user;
  try {
    user = await db.user.create({ data: { name, email, password: await hashPassword(password) } });
  } catch (e) {
    // P2002 = email único (incluye usuarios con soft delete).
    if (e?.code === "P2002") {
      return { name, email, errors: { email: "Ese correo ya está registrado." } };
    }
    throw e;
  }

  // Clase de ejemplo con estudiantes y datos en todos los módulos. Cloudflare D1 no tiene
  // transacciones: si algo falla aquí la cuenta ya existe y sigue siendo usable, así que
  // solo se registra el error (el docente puede crear sus clases a mano).
  try {
    const subject = await db.subject.create({ data: { ...DEFAULT_SUBJECT, userId: user.id } });
    await db.student.createMany({ data: defaultStudents().map((st) => ({ ...st, subjectId: subject.id })) });
    const students = await db.student.findMany({ where: { subjectId: subject.id }, orderBy: { listNumber: "asc" } });
    await seedDemoClass(db, subject.id, students);
  } catch (e) {
    console.error("No se pudieron crear los datos de ejemplo del usuario", user.id, e);
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function login(prevState, formData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { email, error: "Ingresa tu correo y contraseña." };
  }

  // El soft delete de db.js excluye usuarios eliminados.
  const user = await db.user.findUnique({ where: { email } });
  const ok = user && (await verifyPassword(password, user.password));
  if (!ok) {
    return { email, error: "Correo o contraseña incorrectos." };
  }
  // Hashes antiguos (bcrypt) se migran a PBKDF2 al iniciar sesión.
  if (needsRehash(user.password)) {
    await db.user.update({ where: { id: user.id }, data: { password: await hashPassword(password) } });
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
