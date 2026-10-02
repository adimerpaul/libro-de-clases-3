// Conexión a Cloudflare D1 para los scripts de Node (seed, demo).
//   - Local (por defecto): la misma base que usa `next dev`, en .wrangler/state.
//   - Remota (`--remote`): la base de producción vía API HTTP de Cloudflare. Requiere en .env:
//       CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID (database_id de wrangler.jsonc)
//       y CLOUDFLARE_D1_TOKEN (token de API con permiso "D1: Edit").
import "dotenv/config";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../src/generated/prisma-node/client.ts";

export const isRemote = process.argv.includes("--remote");

export async function openDb() {
  if (isRemote) {
    const missing = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_DATABASE_ID", "CLOUDFLARE_D1_TOKEN"].filter(
      (k) => !process.env[k],
    );
    if (missing.length) throw new Error(`Faltan variables en .env para --remote: ${missing.join(", ")}`);
    const prisma = new PrismaClient({
      adapter: new PrismaD1({
        CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_DATABASE_ID: process.env.CLOUDFLARE_DATABASE_ID,
        CLOUDFLARE_D1_TOKEN: process.env.CLOUDFLARE_D1_TOKEN,
      }),
    });
    return { prisma, close: () => prisma.$disconnect() };
  }

  const { getPlatformProxy } = await import("wrangler");
  const proxy = await getPlatformProxy({ remoteBindings: false });
  const prisma = new PrismaClient({ adapter: new PrismaD1(proxy.env.DB) });
  return {
    prisma,
    close: async () => {
      await prisma.$disconnect();
      await proxy.dispose();
    },
  };
}
