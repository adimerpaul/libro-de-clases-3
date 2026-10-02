import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
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

// `binding` = base D1 de Cloudflare (env.DB). También lo usan los scripts de prisma/.
export function createClient(binding) {
  const base = new PrismaClient({ adapter: new PrismaD1(binding) });

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

// Un cliente por binding D1: en Workers el binding llega con cada petición
// (getCloudflareContext), pero es el mismo objeto mientras viva el isolate.
// Al regenerar Prisma en `next dev` cambia PrismaClient y se crea uno nuevo.
const clients = new WeakMap();
function currentClient() {
  const binding = getCloudflareContext().env.DB;
  let entry = clients.get(binding);
  if (!entry || entry.Class !== PrismaClient) {
    entry = { Class: PrismaClient, client: createClient(binding) };
    clients.set(binding, entry);
  }
  return entry.client;
}

// `db.user.findMany(...)` etc. resuelven el cliente de la petición actual.
// Ojo con D1: no hay transacciones reales; `$transaction` ejecuta las consultas
// una por una y no deshace nada si alguna falla.
export const db = new Proxy(
  {},
  {
    get(_, prop) {
      const client = currentClient();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  },
);
