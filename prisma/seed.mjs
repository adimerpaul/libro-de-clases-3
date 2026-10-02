// Crea (o restaura) el admin con su clase de ejemplo.
//   npm run db:seed            → base D1 local (.wrangler/state)
//   npm run db:seed -- --remote → base D1 de producción (ver prisma/d1.mjs)
import { hashPassword } from "../src/lib/hash.js";
import { DEFAULT_SUBJECT, defaultStudents } from "../src/lib/catalog.js";
import { isRemote, openDb } from "./d1.mjs";
import { fillDemoForUser } from "./demo.mjs";

const { prisma, close } = await openDb();
console.log(`Base: ${isRemote ? "D1 remota (producción)" : "D1 local"}`);

const email = "admin@gmail.com";
const password = await hashPassword("admin123Admin");

// upsert: si el admin existía (incluso con soft delete) lo restaura.
const admin = await prisma.user.upsert({
  where: { email },
  update: { password, deletedAt: null },
  create: { name: "Administrador", email, password, role: "admin" },
});
console.log(`Usuario admin listo: ${admin.email} (id ${admin.id})`);

// Igual que al registrarse: si no tiene clases, se le crea la de Matemática con estudiantes.
const hasSubjects = await prisma.subject.count({ where: { userId: admin.id, deletedAt: null } });
if (!hasSubjects) {
  const subject = await prisma.subject.create({ data: { ...DEFAULT_SUBJECT, userId: admin.id } });
  await prisma.student.createMany({ data: defaultStudents().map((st) => ({ ...st, subjectId: subject.id })) });
  console.log(`Clase por defecto creada: ${DEFAULT_SUBJECT.name} · ${DEFAULT_SUBJECT.course}`);
}

// Datos de ejemplo en todos los módulos (solo si la clase está vacía).
console.log(`Datos de ejemplo: ${await fillDemoForUser(prisma, admin.id)}`);
await close();
