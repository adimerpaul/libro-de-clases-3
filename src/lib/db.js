import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Lecturas que deben ignorar los registros con soft delete.
const READ_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
]);

function lowerFirst(s) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
  const base = new PrismaClient({ adapter });

  // Soft delete:
  //  - las lecturas/updates filtran `deletedAt: null`, salvo que la consulta
  //    indique `deletedAt` explícitamente (p. ej. `{ deletedAt: { not: null } }`
  //    para ver la papelera);
  //  - `delete` / `deleteMany` marcan `deletedAt` en vez de borrar la fila.
  // Ojo: los `include` de relaciones no pasan por aquí; filtra `deletedAt` a mano.
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const delegate = base[lowerFirst(model)];

          if (operation === "delete") {
            return delegate.update({
              ...args,
              where: { ...args.where, deletedAt: null },
              data: { deletedAt: new Date() },
            });
          }
          if (operation === "deleteMany") {
            return delegate.updateMany({
              where: { ...args?.where, deletedAt: null },
              data: { deletedAt: new Date() },
            });
          }
          if (READ_OPS.has(operation) && !("deletedAt" in (args?.where ?? {}))) {
            args = { ...args, where: { ...args?.where, deletedAt: null } };
          }
          return query(args);
        },
      },
    },
  });
}

// Reutiliza el cliente entre recargas de `next dev`, salvo que `prisma generate`
// haya producido un PrismaClient nuevo (si no, el cliente cacheado no conoce los
// modelos nuevos: "Unknown argument `subjects`").
const globalForPrisma = globalThis;
if (globalForPrisma.prismaClass !== PrismaClient) {
  globalForPrisma.prisma?.$disconnect();
  globalForPrisma.prisma = undefined;
}
export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaClass = PrismaClient;
}
