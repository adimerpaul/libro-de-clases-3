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
- Base de datos: SQLite (archivo local) con Prisma. No uses MySQL ni otro motor.
- Lint: `npm run lint` (ESLint 9 flat config, `eslint-config-next`).

## Base de datos (Prisma 7.10, fijado)
- No actualices a Prisma 8: el dist-tag `latest` del CLI apunta a una RC.
- Prisma 7 usa driver adapter (`@prisma/adapter-better-sqlite3`), config en `prisma.config.ts` y cliente generado en `src/generated/prisma` (gitignored). Tras cambiar el schema: `npm run db:migrate` y luego `npx prisma generate` (migrate ya no genera). `db.js` recrea el cliente cacheado en `globalThis` si cambió la clase `PrismaClient`; no quites esa comprobación.
- Modelos: `User` → `Subject` (materia/clase: asignatura + curso) → `Student`. Al registrarse se crea la clase por defecto de `src/lib/catalog.js` (Matemática · 1° Medio A + 16 estudiantes); el seed hace lo mismo para el admin.
- Toda consulta de `Subject`/`Student` debe filtrar por `userId` de la sesión (autorización).
- Notas: escala 1,0–7,0 (aprobación 4,0). Parseo, redondeo y promedios solo vía `src/lib/grades.js` (lo comparten servidor y planilla). `Evaluation` = columna N1, N2…; `Grade` tiene `@@unique([evaluationId, studentId])` y se guarda con `upsert` (revive filas con soft delete).
- `DATABASE_URL="file:./prisma/dev.db"` en `.env`. Seed: `npm run db:seed` (admin@gmail.com / admin123Admin).
- Importa siempre `db` desde `@/lib/db`, nunca un `PrismaClient` nuevo. Toda tabla lleva `deletedAt DateTime?`: el cliente extendido filtra `deletedAt: null` y convierte `delete`/`deleteMany` en soft delete. Los `include` de relaciones NO se filtran: revisa `deletedAt` a mano.
- Auth: `src/lib/session.js`. Token aleatorio en cookie httpOnly `session`; en la tabla `tokens` solo se guarda su SHA-256. `src/proxy.js` solo comprueba que exista la cookie; la validación real es `getSession()`.

## Referencia de UI (`ui/`)
- `ui/Libro de Clases.dc.html` es un mockup de todas las pantallas. Úsalo como guía de flujo, contenido y layout, no lo copies literal.
  Su runtime (`ui/support.js`, `<sc-if>`, `{{ }}`) no es parte de la app y no debe importarse.
- `ui/_ds/broadsheet-*/readme.md` describe el sistema de diseño (tipografía serif, acentos cian/magenta, iconos Phosphor duotone).
  Es inspiración visual; implementa con Tailwind en `src/`.
- No edites archivos dentro de `ui/`.
