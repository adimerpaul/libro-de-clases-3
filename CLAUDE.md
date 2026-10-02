# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto
"Libro de Clases 3.0": administrador escolar estilo Lirmi/Webclass. Pantallas: login, inicio, mis clases,
libro de clases (registro de clases), asistencia, calificaciones, estudiantes, antecedentes familiares, actividades.
Interfaz y textos en español.

## Stack
- Next.js 16 (App Router en `src/app/`), React 19, JavaScript (no TypeScript), Tailwind v4 (`@import "tailwindcss"` en globals.css, sin tailwind.config).
- Alias de imports: `@/*` → `src/*`.
- Se publica en **Cloudflare Workers** con OpenNext (`@opennextjs/cloudflare`, `wrangler.jsonc`, `open-next.config.ts`). Todo el código de servidor corre en workerd: nada de módulos nativos (better-sqlite3, sharp, bcrypt) ni escribir en disco.
- Base de datos: **Cloudflare D1 (SQLite)** con Prisma. No uses MySQL, Postgres ni un archivo SQLite local.
- Lint: `npm run lint`. Build real: `npx opennextjs-cloudflare build`; probar el Worker: `npx wrangler dev`. Publicar: `npm run deploy`.

## Base de datos (Prisma 7.10 + D1, fijado)
- No actualices a Prisma 8: el dist-tag `latest` del CLI apunta a una RC.
- `db` (`@/lib/db`) es un Proxy que toma el binding `env.DB` de la petición (`getCloudflareContext()`). Importa siempre `db`, nunca un `PrismaClient` nuevo. En `next dev` los bindings D1/R2 se emulan en `.wrangler/state` (`initOpenNextCloudflareForDev` en next.config.mjs).
- **D1 no tiene transacciones**: `$transaction` ejecuta las consultas una por una sin rollback. Ordena las escrituras para que un fallo a medias no deje datos inválidos.
- Plan gratuito de Workers: máx. ~50 consultas D1 y ~10 ms de CPU por petición. Usa `createMany`/`createManyAndReturn` en vez de bucles de `create`.
- Dos clientes generados (gitignored): `src/generated/prisma` (runtime workerd, para la app) y `src/generated/prisma-node` (para los scripts de `prisma/*.mjs`).
- Migraciones con wrangler, carpeta `migrations/` (no uses `prisma migrate dev`): cambia `schema.prisma` → `npm run db:migration -- nombre` (genera el SQL comparando con la D1 local) → `npm run db:migrate:local` → `npx prisma generate`. En producción: `npm run db:migrate:remote`.
- Seed/demo: `npm run db:seed` (admin@gmail.com / admin123Admin) y `npm run db:demo -- <correo>`; agrega `--remote` para producción (variables `CLOUDFLARE_*` en `.env`, ver `prisma/d1.mjs`).
- Modelos: `User` → `Subject` (materia/clase: asignatura + curso) → `Student`. Al registrarse se crea la clase por defecto de `src/lib/catalog.js` con datos de ejemplo de `src/lib/demo-data.js`.
- Toda consulta de `Subject`/`Student` debe filtrar por `userId` de la sesión (autorización).
- Notas: escala 1,0–7,0 (aprobación 4,0). Parseo, redondeo y promedios solo vía `src/lib/grades.js`. `Evaluation` = columna N1, N2…; `Grade` tiene `@@unique([evaluationId, studentId])` y se guarda con `upsert` (revive filas con soft delete).
- Toda tabla lleva `deletedAt DateTime?`: el cliente extendido filtra `deletedAt: null` y convierte `delete`/`deleteMany` en soft delete. Los `include` de relaciones NO se filtran: revisa `deletedAt` a mano.

## Auth y fotos
- `src/lib/session.js`: token aleatorio en cookie httpOnly `session`; en la tabla `tokens` solo su SHA-256. Las páginas protegidas usan `requireSession()` (redirige a /login); no hay middleware/proxy.
- Contraseñas: hash con `src/lib/hash.js` (PBKDF2 de WebCrypto; bcrypt solo para verificar hashes antiguos, que se migran al iniciar sesión). Valida con `passwordError()` de `src/lib/password.js`: en desarrollo acepta cualquiera (p. ej. "123"); en producción exige 8+ caracteres con letras y números.
- Fotos: el navegador las convierte a WebP 400×400 (`src/lib/webp-client.js`, hook `src/components/use-webp-photo.js`) y el servidor las valida con `inspectWebp` (`src/lib/webp.js`: tipo real, tamaño, sin EXIF/XMP) antes de guardarlas en R2 (binding `PHOTOS`, `src/lib/photos.js`). Se sirven solo con sesión por `/api/fotos/...`.

## Referencia de UI (`ui/`)
- `ui/Libro de Clases.dc.html` es un mockup de todas las pantallas. Úsalo como guía de flujo, contenido y layout, no lo copies literal.
  Su runtime (`ui/support.js`, `<sc-if>`, `{{ }}`) no es parte de la app y no debe importarse.
- `ui/_ds/broadsheet-*/readme.md` describe el sistema de diseño (tipografía serif, acentos cian/magenta, iconos Phosphor duotone).
  Es inspiración visual; implementa con Tailwind en `src/`.
- No edites archivos dentro de `ui/`.
