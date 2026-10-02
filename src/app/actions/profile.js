"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { passwordError } from "@/lib/password";
import { MAX_PHOTO_BYTES, photoToWebp, removePhoto, writePhoto } from "@/lib/photos";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// Actualiza nombre, correo y foto del usuario de la sesión.
export async function updateProfile(prevState, formData) {
  const { user } = await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const errors = {};
  if (name.length < 3) errors.name = "Ingresa tu nombre completo.";
  else if (name.length > 80) errors.name = "Máximo 80 caracteres.";
  if (!EMAIL_RE.test(email)) errors.email = "Ingresa un correo válido.";

  let webp = null;
  const file = formData.get("photo");
  if (file && typeof file !== "string" && file.size > 0) {
    if (!file.type.startsWith("image/")) errors.photo = "El archivo debe ser una imagen.";
    else if (file.size > MAX_PHOTO_BYTES) errors.photo = "La foto no puede superar 5 MB.";
    else {
      try {
        webp = await photoToWebp(file);
      } catch {
        errors.photo = "No se pudo leer la imagen. Prueba con JPG, PNG o WebP.";
      }
    }
  }
  if (Object.keys(errors).length) return { values: { name, email }, errors };

  const data = { name, email };
  const removeCurrent = formData.get("removePhoto") === "on";
  if (webp) data.photo = await writePhoto(user.id, webp, "usuarios");
  else if (removeCurrent) data.photo = null;

  try {
    await db.user.update({ where: { id: user.id }, data });
  } catch (e) {
    if (data.photo) await removePhoto(data.photo, "usuarios"); // no dejar archivos huérfanos
    // P2002 = email único (incluye usuarios con soft delete).
    if (e?.code === "P2002") return { values: { name, email }, errors: { email: "Ese correo ya está en uso." } };
    throw e;
  }
  if ("photo" in data) await removePhoto(user.photo, "usuarios");

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Datos guardados." };
}

// Cambia la contraseña verificando la actual. Cierra las sesiones de otros dispositivos.
export async function changePassword(prevState, formData) {
  const { user, tokenId } = await requireSession();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const errors = {};
  if (!current) errors.current = "Ingresa tu contraseña actual.";
  const nextError = passwordError(next);
  if (nextError) errors.next = nextError;
  else if (next === current) errors.next = "La nueva contraseña debe ser distinta de la actual.";
  if (next !== confirm) errors.confirm = "Las contraseñas no coinciden.";
  if (Object.keys(errors).length) return { errors };

  const { password: hash } = await db.user.findUnique({ where: { id: user.id }, select: { password: true } });
  if (!(await bcrypt.compare(current, hash))) {
    return { errors: { current: "La contraseña actual no es correcta." } };
  }

  await db.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(next, 10) } });
  // Soft delete de los demás tokens: quien tuviera tu contraseña anterior queda fuera.
  const { count } = await db.token.deleteMany({ where: { userId: user.id, id: { not: tokenId } } });

  revalidatePath("/dashboard/perfil");
  return {
    ok: true,
    message:
      count > 0
        ? `Contraseña actualizada. Se cerró tu sesión en ${count} ${count === 1 ? "otro dispositivo" : "otros dispositivos"}.`
        : "Contraseña actualizada.",
  };
}
