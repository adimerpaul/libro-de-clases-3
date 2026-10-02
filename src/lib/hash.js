// Hash de contraseñas con PBKDF2-SHA256 de WebCrypto (nativo en Cloudflare Workers y Node).
// bcryptjs (JavaScript puro) supera el límite de CPU por petición de Workers; solo se usa para
// verificar hashes antiguos ("$2…"), que `needsRehash` marca para migrarlos al iniciar sesión.
// Formato: pbkdf2$<iteraciones>$<sal base64>$<hash base64>
import bcrypt from "bcryptjs";

const ITERATIONS = 100_000; // máximo que acepta PBKDF2 en Workers
const enc = new TextEncoder();

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  if (stored.startsWith("$2")) return bcrypt.compare(password, stored);
  const [scheme, iter, salt, expected] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const actual = await derive(password, fromB64(salt), Number(iter));
  const want = fromB64(expected);
  // Comparación en tiempo constante.
  let diff = actual.length ^ want.length;
  for (let i = 0; i < Math.min(actual.length, want.length); i++) diff |= actual[i] ^ want[i];
  return diff === 0;
}

export function needsRehash(stored) {
  return !stored?.startsWith(`pbkdf2$${ITERATIONS}$`);
}
