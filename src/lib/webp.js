// Validación de archivos WebP leyendo sus encabezados (formato RIFF). Sin dependencias:
// en Cloudflare Workers no hay sharp, así que el navegador convierte la foto y el servidor
// solo acepta un WebP "limpio": tipo real, tamaño acotado y sin metadatos (EXIF/XMP con GPS).

export const MAX_WEBP_BYTES = 400 * 1024;
export const MAX_WEBP_SIDE = 512;
export const PHOTO_SIDE = 400; // lo que genera el navegador (src/lib/webp-client.js)

// ICCP = perfil de color (Chrome lo agrega al codificar desde canvas); no contiene datos personales.
const ALLOWED_CHUNKS = new Set(["VP8 ", "VP8L", "VP8X", "ALPH", "ICCP"]);

function fourcc(b, o) {
  return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
}
const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u24 = (b, o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

// bytes: Uint8Array. Devuelve { width, height } o { error }.
export function inspectWebp(bytes) {
  if (bytes.length > MAX_WEBP_BYTES) return { error: "La foto es demasiado grande." };
  if (bytes.length < 30 || fourcc(bytes, 0) !== "RIFF" || fourcc(bytes, 8) !== "WEBP") {
    return { error: "El archivo no es una imagen WebP válida." };
  }
  if (u32(bytes, 4) + 8 > bytes.length) return { error: "El archivo WebP está incompleto." };

  let width = 0;
  let height = 0;
  for (let o = 12; o + 8 <= bytes.length; ) {
    const id = fourcc(bytes, o);
    const size = u32(bytes, o + 4);
    const data = o + 8;
    if (data + size > bytes.length) return { error: "El archivo WebP está dañado." };
    if (!ALLOWED_CHUNKS.has(id)) {
      // EXIF/XMP pueden traer GPS u otros datos personales; ANIM = animación.
      return { error: "La foto trae metadatos o animación; vuelve a subirla desde la app." };
    }
    if (id === "VP8X") {
      width = u24(bytes, data + 4) + 1;
      height = u24(bytes, data + 7) + 1;
    } else if (id === "VP8 " && !width) {
      // Cabecera de cuadro clave: 3 bytes de frame tag + start code 9d 01 2a.
      if (bytes[data + 3] !== 0x9d || bytes[data + 4] !== 0x01 || bytes[data + 5] !== 0x2a) {
        return { error: "El archivo WebP está dañado." };
      }
      width = u16(bytes, data + 6) & 0x3fff;
      height = u16(bytes, data + 8) & 0x3fff;
    } else if (id === "VP8L" && !width) {
      if (bytes[data] !== 0x2f) return { error: "El archivo WebP está dañado." };
      const bits = u32(bytes, data + 1);
      width = (bits & 0x3fff) + 1;
      height = ((bits >>> 14) & 0x3fff) + 1;
    }
    o = data + size + (size & 1); // los chunks se rellenan a tamaño par
  }

  if (!width || !height) return { error: "El archivo WebP no tiene imagen." };
  if (width > MAX_WEBP_SIDE || height > MAX_WEBP_SIDE) {
    return { error: `La foto debe medir como máximo ${MAX_WEBP_SIDE}×${MAX_WEBP_SIDE} px.` };
  }
  return { width, height };
}
