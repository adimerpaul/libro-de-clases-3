import "server-only";
import path from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Fuera de public/: son fotos de personas (menores incluidos) y solo se sirven con sesión
// (ver src/app/api/fotos/). Carpetas: "estudiantes" y "usuarios".
const PHOTO_ROOT = path.join(process.cwd(), "storage", "fotos");
const FOLDERS = new Set(["estudiantes", "usuarios"]);

function photoDir(folder) {
  if (!FOLDERS.has(folder)) throw new Error(`Carpeta de fotos inválida: ${folder}`);
  return path.join(PHOTO_ROOT, folder);
}

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Convierte cualquier imagen subida a WebP cuadrado de 400px.
// sharp descarta los metadatos EXIF (GPS, cámara) por defecto.
// Lanza un error si el archivo no es una imagen válida.
export async function photoToWebp(file) {
  const input = Buffer.from(await file.arrayBuffer());
  return sharp(input, { limitInputPixels: 50_000_000 })
    .rotate() // respeta la orientación EXIF antes de descartarla
    .resize(400, 400, { fit: "cover", position: "attention" })
    .webp({ quality: 80 })
    .toBuffer();
}

// Guarda con nombre único (sirve también para invalidar caché del navegador).
export async function writePhoto(ownerId, webp, folder = "estudiantes") {
  const dir = photoDir(folder);
  await mkdir(dir, { recursive: true });
  const name = `${ownerId}-${Date.now()}.webp`;
  await writeFile(path.join(dir, name), webp);
  return name;
}

export async function removePhoto(name, folder = "estudiantes") {
  if (name) await rm(path.join(photoDir(folder), path.basename(name)), { force: true });
}

export function readPhoto(name, folder = "estudiantes") {
  return readFile(path.join(photoDir(folder), path.basename(name)));
}
