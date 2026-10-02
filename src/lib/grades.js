// Escala chilena: notas de 1,0 a 7,0 con una décima; aprobación con 4,0.
// Sin imports: lo usan el servidor (validación) y el navegador (planilla).

export const MIN_GRADE = 1;
export const MAX_GRADE = 7;
export const PASSING_GRADE = 4;

// Redondeo a una décima "hacia arriba" en el 5 (3,95 → 4,0), como se usa en Chile.
export function roundGrade(n) {
  return Math.round(n * 10 + 1e-9) / 10;
}

// Interpreta lo que escribe el docente. Devuelve { value } (number | null si vacío) o { error }.
//   "5,5" | "5.5" | "55" → 5.5   ·   "7" → 7.0   ·   "" → null (borrar nota)
export function parseGrade(raw) {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (s === "") return { value: null };
  if (!/^\d{1,2}(\.\d)?$/.test(s)) return { error: "Usa el formato 5,5 (de 1,0 a 7,0)." };
  let n = Number(s);
  // Atajo de digitación: "55" significa 5,5 (dos dígitos sin separador, de 10 a 70).
  if (!s.includes(".") && n >= 10) n = n / 10;
  if (n < MIN_GRADE || n > MAX_GRADE) return { error: "La nota debe estar entre 1,0 y 7,0." };
  return { value: roundGrade(n) };
}

export function formatGrade(n) {
  return n == null ? "" : n.toFixed(1).replace(".", ",");
}

// Promedio simple de las notas existentes (ignora vacías), redondeado a una décima.
export function average(values) {
  const v = values.filter((x) => x != null);
  return v.length ? roundGrade(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

export function isFailing(n) {
  return n != null && n < PASSING_GRADE;
}
