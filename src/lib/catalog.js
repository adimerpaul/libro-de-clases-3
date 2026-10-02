// Datos de referencia sacados del mockup (ui/Libro de Clases.dc.html).
// Sin imports: lo usan tanto la app como prisma/seed.mjs.

export const SUBJECT_OPTIONS = [
  "Lengua y Literatura",
  "Matemática",
  "Inglés",
  "Historia, Geografía y Cs. Sociales",
  "Biología",
  "Química",
  "Física",
  "Educación Física y Salud",
  "Artes Visuales",
  "Música",
  "Tecnología",
  "Orientación",
];

export const COURSE_OPTIONS = [
  "1° Medio A",
  "1° Medio B",
  "2° Medio A",
  "2° Medio B",
  "3° Medio A",
  "4° Medio A",
];

// Clase que se crea automáticamente al registrarse.
export const DEFAULT_SUBJECT = {
  name: "Matemática",
  course: "1° Medio A",
  schedule: "Lun y Mié 08:00 · Vie 11:30",
};

const DEFAULT_STUDENT_NAMES = [
  "Agustina Araya Soto",
  "Benjamín Bravo Muñoz",
  "Catalina Cárdenas Rojas",
  "Diego Espinoza Vera",
  "Florencia Fuentes Díaz",
  "Gaspar González Pino",
  "Isidora Henríquez Lagos",
  "Joaquín Jara Salinas",
  "Martina Leiva Torres",
  "Matías Morales Cid",
  "Antonella Núñez Pérez",
  "Tomás Orellana Ríos",
  "Sofía Pizarro Vidal",
  "Vicente Quezada Mora",
  "Emilia Reyes Contreras",
  "Lucas Sepúlveda Ortiz",
];

// Dígito verificador de un RUT chileno (módulo 11).
function rutDv(body) {
  let sum = 0;
  let factor = 2;
  for (let n = body; n > 0; n = Math.floor(n / 10)) {
    sum += (n % 10) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (sum % 11);
  return dv === 11 ? "0" : dv === 10 ? "K" : String(dv);
}

export function formatRut(body) {
  return `${body.toLocaleString("es-CL")}-${rutDv(body)}`;
}

// "21.123.456-k", "211234567K", etc. → "21.123.456-K", o null si el DV no cuadra.
export function normalizeRut(input) {
  const clean = String(input).replace(/[.\-\s]/g, "").toUpperCase();
  const match = clean.match(/^(\d{7,8})([\dK])$/);
  if (!match) return null;
  const body = Number(match[1]);
  return rutDv(body) === match[2] ? formatRut(body) : null;
}

// Lista de estudiantes de ejemplo, determinista (mismos datos en cada registro).
export function defaultStudents() {
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  return DEFAULT_STUDENT_NAMES.map((full, i) => {
    const [firstName, lastName, secondLastName] = full.split(" ");
    const body = 21_000_000 + Math.floor(rnd() * 2_999_999);
    const birthDate = new Date(Date.UTC(2010, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27)));
    return { listNumber: i + 1, firstName, lastName, secondLastName, rut: formatRut(body), birthDate };
  });
}
