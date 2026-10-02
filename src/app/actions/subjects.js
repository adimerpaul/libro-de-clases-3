"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { COURSE_OPTIONS, SUBJECT_OPTIONS } from "@/lib/catalog";

export async function createSubject(prevState, formData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const name = String(formData.get("name") ?? "");
  const course = String(formData.get("course") ?? "");
  const schedule = String(formData.get("schedule") ?? "").trim() || null;

  if (!SUBJECT_OPTIONS.includes(name) || !COURSE_OPTIONS.includes(course)) {
    return { error: "Elige un curso y una asignatura de la lista." };
  }

  const subject = await db.subject.create({
    data: { name, course, schedule, userId: session.user.id },
  });
  // El layout del dashboard lista las clases para el menú: hay que refrescarlo.
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/clases/${subject.id}`);
}
