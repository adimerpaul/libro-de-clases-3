import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { DEFAULT_SUBJECT, defaultStudents } from "../src/lib/catalog.js";
import { fillDemoForUser } from "./demo.mjs";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL }),
});

const email = "admin@gmail.com";
const password = await bcrypt.hash("admin123Admin", 10);

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
  await prisma.subject.create({
    data: { ...DEFAULT_SUBJECT, userId: admin.id, students: { create: defaultStudents() } },
  });
  console.log(`Clase por defecto creada: ${DEFAULT_SUBJECT.name} · ${DEFAULT_SUBJECT.course}`);
}

// Igual que al registrarse: datos de ejemplo en todos los módulos (solo si la clase está vacía).
console.log(`Datos de ejemplo: ${await fillDemoForUser(prisma, admin.id)}`);
await prisma.$disconnect();
