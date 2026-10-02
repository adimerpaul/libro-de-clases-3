// Carga datos de ejemplo (asistencia, registro, notas, actividades, antecedentes familiares)
// en la primera clase de un usuario que ya existe:
//   npm run db:demo -- correo@ejemplo.cl            (base D1 local)
//   npm run db:demo -- correo@ejemplo.cl --remote   (producción, ver prisma/d1.mjs)
// Solo escribe si esa clase está vacía en todos esos módulos (no duplica ni pisa datos reales).
import { pathToFileURL } from "node:url";
import { seedDemoClass } from "../src/lib/demo-data.js";
import { openDb } from "./d1.mjs";

export async function fillDemoForUser(prisma, userId) {
  const subject = await prisma.subject.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { id: "asc" },
    include: { students: { where: { deletedAt: null }, orderBy: { listNumber: "asc" } } },
  });
  if (!subject) return "no tiene clases";
  if (subject.students.length === 0) return `la clase ${subject.name} · ${subject.course} no tiene estudiantes`;

  const where = { subjectId: subject.id };
  const counts = {
    "registro de clases": await prisma.lesson.count({ where }),
    asistencia: await prisma.attendanceSession.count({ where }),
    calificaciones: await prisma.evaluation.count({ where }),
    actividades: await prisma.activity.count({ where }),
    "antecedentes familiares": await prisma.familyRecord.count({
      where: { studentId: { in: subject.students.map((s) => s.id) } },
    }),
  };
  const filled = Object.entries(counts).filter(([, n]) => n > 0).map(([k]) => k);
  if (filled.length) return `la clase ${subject.name} · ${subject.course} ya tiene datos en: ${filled.join(", ")} (no se tocó)`;

  await seedDemoClass(prisma, subject.id, subject.students);
  return `datos de ejemplo cargados en ${subject.name} · ${subject.course}`;
}

// Ejecución directa: node prisma/demo.mjs <correo>
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const email = process.argv.slice(2).find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  if (!email) {
    console.error("Uso: npm run db:demo -- correo@ejemplo.cl");
    process.exit(1);
  }
  const { prisma, close } = await openDb();
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  console.log(user ? `${email}: ${await fillDemoForUser(prisma, user.id)}` : `No existe el usuario ${email}`);
  await close();
}
