import { listLocalDatabases } from "@prisma/adapter-d1";
import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// La base real es Cloudflare D1 (wrangler.jsonc). Las migraciones las aplica wrangler
// (carpeta migrations/); Prisma solo genera el cliente y el SQL de cada migración.
// El datasource apunta a la copia local de D1 (.wrangler/state) para que
// `prisma migrate diff --from-config-datasource` compare contra ella (ver prisma/new-migration.mjs).
const localD1Directory = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const [localD1] = existsSync(localD1Directory)
  ? listLocalDatabases().filter((f) => !f.endsWith("metadata.sqlite"))
  : [];

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: localD1 ? `file:${localD1}` : "file:./.wrangler/sin-base-local.sqlite",
  },
});
