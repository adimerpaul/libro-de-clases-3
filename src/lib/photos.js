import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { inspectWebp } from "@/lib/webp";

// Fotos de personas (menores incluidos) en el bucket R2 privado `PHOTOS` (wrangler.jsonc).
// Solo se sirven con sesión (ver src/app/api/fotos/). Carpetas: "estudiantes" y "usuarios".
const FOLDERS = new Set(["estudiantes", "usuarios"]);

function bucket() {
  return getCloudflareContext().env.PHOTOS;
}

function keyFor(folder, name) {
  if (!FOLDERS.has(folder)) throw new Error(`Carpeta de fotos inválida: ${folder}`);
  // basename: el nombre viene de la BD, pero nunca dejamos que salga de su carpeta.
  return `${folder}/${String(name).split(/[\\/]/).pop()}`;
}

// Lee la foto subida en `formData[field]`: debe ser el WebP que genera el navegador
// (src/lib/webp-client.js). Devuelve {} si no vino archivo, { webp } o { error }.
export async function readUploadedPhoto(formData, field = "photo") {
  const file = formData.get(field);
  if (!file || typeof file === "string" || file.size === 0) return {};
  const webp = new Uint8Array(await file.arrayBuffer());
  const check = inspectWebp(webp);
  return check.error ? { error: check.error } : { webp };
}

// Guarda con nombre único (sirve también para invalidar caché del navegador).
export async function writePhoto(ownerId, webp, folder = "estudiantes") {
  const name = `${ownerId}-${Date.now()}.webp`;
  await bucket().put(keyFor(folder, name), webp, { httpMetadata: { contentType: "image/webp" } });
  return name;
}

export async function removePhoto(name, folder = "estudiantes") {
  if (name) await bucket().delete(keyFor(folder, name));
}

// Devuelve el cuerpo (ReadableStream) o null si no existe.
export async function readPhoto(name, folder = "estudiantes") {
  const object = await bucket().get(keyFor(folder, name));
  return object?.body ?? null;
}
