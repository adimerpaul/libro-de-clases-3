// Crea la siguiente migración de D1 a partir de los cambios en prisma/schema.prisma:
//   npm run db:migration -- nombre_corto
// Compara la base D1 local (.wrangler/state) con el schema y escribe migrations/NNNN_nombre.sql.
// Después: `npm run db:migrate:local` (y `npm run db:migrate:remote` al publicar).
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, unlinkSync } from "node:fs";

const name = process.argv[2]?.replace(/[^a-z0-9_]+/gi, "_").toLowerCase();
if (!name) {
  console.error("Uso: npm run db:migration -- nombre_corto");
  process.exit(1);
}

const next = readdirSync("migrations").filter((f) => /^\d{4}_.*\.sql$/.test(f)).length + 1;
const file = `migrations/${String(next).padStart(4, "0")}_${name}.sql`;

execFileSync(
  "npx",
  ["prisma", "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--script", "-o", file],
  { stdio: "inherit", shell: true },
);

if (readFileSync(file, "utf8").includes("This is an empty migration")) {
  unlinkSync(file);
  console.log("Sin cambios: la base local ya coincide con el schema. No se creó migración.");
} else {
  console.log(`Creada ${file}. Revísala y aplícala con: npm run db:migrate:local`);
}
