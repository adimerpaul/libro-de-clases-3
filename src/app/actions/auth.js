"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { DEFAULT_SUBJECT, defaultStudents } from "@/lib/catalog";
import { seedDemoClass } from "@/lib/demo-data";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(prevState, formData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const errors = {};
  if (name.length < 3) errors.name = "Ingresa tu nombre completo.";
  if (!EMAIL_RE.test(email)) errors.email = "Ingresa un correo válido.";
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    errors.password = "Mínimo 8 caracteres, con letras y números.";
  }
  if (password !== confirm) errors.confirm = "Las contraseñas no coinciden.";
  if (Object.keys(errors).length) return { name, email, errors };

  const hashed = await bcrypt.hash(password, 10);
  let user;
  try {
    // Una sola transacción: usuario + clase por defecto + estudiantes + datos de ejemplo
    // en todos los módulos (si algo falla, no queda una cuenta a medias).
    user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          password: hashed,
          subjects: {
            create: { ...DEFAULT_SUBJECT, students: { create: defaultStudents() } },
          },
        },
        include: { subjects: { include: { students: { orderBy: { listNumber: "asc" } } } } },
      });
      const [subject] = created.subjects;
      await seedDemoClass(tx, subject.id, subject.students);
      return created;
    });
  } catch (e) {
    // P2002 = email único (incluye usuarios con soft delete).
    if (e?.code === "P2002") {
      return { name, email, errors: { email: "Ese correo ya está registrado." } };
    }
    throw e;
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
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) {
    return { email, error: "Correo o contraseña incorrectos." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
