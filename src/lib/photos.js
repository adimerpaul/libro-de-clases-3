import "server-only";
import path from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Fuera de public/: son fotos de menores y solo se sirven con sesión
// (ver src/app/api/fotos/estudiantes/[id]/route.js).
const PHOTO_DIR = path.join(process.cwd(), "storage", "fotos", "estudiantes");

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
export async function writePhoto(studentId, webp) {
  await mkdir(PHOTO_DIR, { recursive: true });
  const name = `${studentId}-${Date.now()}.webp`;
  await writeFile(path.join(PHOTO_DIR, name), webp);
  return name;
}

export async function removePhoto(name) {
  if (name) await rm(path.join(PHOTO_DIR, path.basename(name)), { force: true });
}

export function readPhoto(name) {
  return readFile(path.join(PHOTO_DIR, path.basename(name)));
}
