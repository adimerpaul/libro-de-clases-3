// Conversión a WebP en el navegador (en Cloudflare Workers no hay sharp).
// Recorta al centro, escala a 400×400 y re-codifica: el canvas no copia metadatos
// (EXIF/GPS), y createImageBitmap aplica antes la orientación de la cámara.
import { PHOTO_SIDE } from "./webp";


export const MAX_SOURCE_MB = 15;

// Validación rápida antes de convertir. Devuelve el mensaje de error o null.
export function checkSourceImage(file) {
  if (!file.type.startsWith("image/")) return "El archivo debe ser una imagen.";
  if (file.size > MAX_SOURCE_MB * 1024 * 1024) return `La imagen no puede superar ${MAX_SOURCE_MB} MB.`;
  return null;
}

// File (JPG, PNG, WebP, HEIC si el navegador lo abre…) → File "foto.webp" de 400×400.
export async function toWebpFile(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("No se pudo abrir la imagen. Prueba con JPG, PNG o WebP.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIDE;
  canvas.height = PHOTO_SIDE;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // fondo para PNG con transparencia
  ctx.fillRect(0, 0, PHOTO_SIDE, PHOTO_SIDE);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    PHOTO_SIDE,
    PHOTO_SIDE,
  );
  bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  // Navegadores sin codificador WebP devuelven PNG en silencio.
  if (!blob || blob.type !== "image/webp") {
    throw new Error("Tu navegador no puede convertir fotos a WebP. Usa Chrome, Edge o Firefox actualizados.");
  }
  return new File([blob], "foto.webp", { type: "image/webp" });
}
