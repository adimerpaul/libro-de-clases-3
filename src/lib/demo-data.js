// Datos de ejemplo para una clase recién creada, para que el docente vea cada módulo con
// contenido: registro de clases, asistencia, calificaciones, actividades y antecedentes familiares.
// Lo usan el registro (src/app/actions/auth.js) y prisma/seed.mjs: solo imports relativos sin servidor.
// Todo es determinista (mismo resultado en cada cuenta) y relativo a la fecha de hoy en Chile.

import { todayISO } from "./attendance.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function isoToDate(iso) {
  return new Date(`${iso}T00:00:00Z`);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

// Generador pseudoaleatorio con semilla fija (mismos datos para todos).
function makeRandom(seed) {
  return () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
}

// Clases del horario por defecto (Lun y Mié 08:00 → bloque 1 · Vie 11:30 → bloque 3),
// de la más reciente hacia atrás, incluyendo hoy si corresponde.
function pastClassSlots(today, count) {
  const blockByWeekday = { 1: 1, 3: 1, 5: 3 }; // getUTCDay: 1 = lunes, 3 = miércoles, 5 = viernes
  const slots = [];
  for (let d = today; slots.length < count; d = addDays(d, -1)) {
    const block = blockByWeekday[d.getUTCDay()];
    if (block) slots.push({ date: d, block });
  }
  return slots;
}

const LESSON_TOPICS = [
  "OA 3 · Resolución de ecuaciones cuadráticas por factorización. Guía en parejas y corrección en pizarra.",
  "OA 3 · Función cuadrática: gráfico, vértice y eje de simetría. Trabajo con GeoGebra.",
  "OA 2 · Evaluación sumativa: potencias y raíces.",
  "OA 2 · Racionalización de expresiones con raíces. Ejercicios guiados.",
  "OA 1 · Números reales: propiedades y orden en la recta numérica.",
  "OA 1 · Diagnóstico de la unidad y repaso de números racionales.",
];

const EVALUATIONS = [
  { title: "Prueba Unidad 1", daysAgo: 30 },
  { title: "Guía evaluada", daysAgo: 18 },
  { title: "Prueba Unidad 2", daysAgo: 4 },
];

const MOTHER_NAMES = ["Patricia", "Marcela", "Carolina", "Claudia", "Andrea", "Paola", "Verónica", "Lorena"];
const FATHER_NAMES = ["Jorge", "Luis", "Rodrigo", "Cristián", "Mauricio", "Felipe", "Juan Pablo", "Sergio"];
const MATERNAL_SURNAMES = ["Vidal", "Lagos", "Fuentes", "Soto", "Rojas", "Muñoz"];
const OCCUPATIONS = ["Técnico en enfermería", "Profesora", "Comerciante", "Administrativa", "Conductor", "Contador", "Dueña de casa", "Electricista"];
const STREETS = ["Av. Alemania", "Calle Montt", "Av. Pablo Neruda", "Calle Prat", "Av. Caupolicán", "Calle Bulnes"];
const LIVES_WITH = ["Madre, padre y 1 hermano", "Madre y abuela", "Madre y padre", "Padre y 2 hermanas", "Madre, padre y 2 hermanos"];
const HEALTH = ["Sin antecedentes", "Asma leve (usa inhalador)", "Sin antecedentes", "Alergia a la penicilina", "Sin antecedentes", "Usa lentes ópticos"];
const INSURANCE = ["Fonasa A", "Fonasa B", "Fonasa C", "Fonasa D", "Isapre"];

function phone(rnd) {
  const n = () => String(1000 + Math.floor(rnd() * 9000));
  return `+56 9 ${n()} ${n()}`;
}

function slug(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, ".");
}

// students: [{ id, lastName, secondLastName, ... }] ordenados por número de lista.
export function buildDemoData(students, now = new Date()) {
  const today = isoToDate(todayISO(now));
  const rnd = makeRandom(11);

  // Cada estudiante tiene un "perfil" estable: asistencia y rendimiento.
  // Los n° 4 y 12 tienen baja asistencia y notas bajas (para ver alertas en rojo).
  const profile = students.map((st, i) => ({
    id: st.id,
    absentRate: i === 3 || i === 11 ? 0.3 : 0.05,
    lateRate: 0.06,
    level: i === 3 || i === 11 ? 3.6 : 4.3 + rnd() * 2.3,
  }));

  // Registro de clases + asistencia: las 6 últimas clases; las 2 más recientes sin firmar.
  const slots = pastClassSlots(today, 6);
  const lessons = slots.map((slot, k) => ({
    date: slot.date,
    block: slot.block,
    topic: LESSON_TOPICS[k % LESSON_TOPICS.length],
    signedAt: k < 2 ? null : addDays(slot.date, 0.6), // firmada ese día por la tarde
  }));
  const attendance = slots.map((slot, k) => ({
    date: slot.date,
    block: slot.block,
    signedAt: k < 2 ? null : addDays(slot.date, 0.6),
    records: profile.map((p) => {
      const r = rnd();
      return { studentId: p.id, status: r < p.absentRate ? "A" : r < p.absentRate + p.lateRate ? "T" : "P" };
    }),
  }));

  // Calificaciones: 3 evaluaciones pasadas con nota para todos.
  const evaluations = EVALUATIONS.map((ev, k) => ({
    title: ev.title,
    date: addDays(today, -ev.daysAgo),
    position: k + 1,
    grades: profile.map((p) => {
      const raw = p.level + (rnd() - 0.5) * 1.6;
      return { studentId: p.id, value: Math.round(Math.min(7, Math.max(1.5, raw)) * 10) / 10 };
    }),
  }));

  // Actividades: una pasada y las próximas semanas.
  const activities = [
    { days: -4, title: "Prueba Unidad 2", kind: "Evaluación", detail: "Potencias, raíces y racionalización" },
    { days: 3, title: "Prueba de Matemática", kind: "Evaluación", detail: "Función cuadrática · 2° bloque" },
    { days: 6, title: "Reunión de apoderados", kind: "Reunión", detail: "19:00 · Sala 12" },
    { days: 7, title: "Entrega guía de ejercicios", kind: "Entrega", detail: "Plataforma o impreso" },
    { days: 14, title: "Salida pedagógica", kind: "Salida", detail: "Museo Regional · llevar autorización firmada" },
    { days: 28, title: "Cierre de notas parcial", kind: "Plazo", detail: "Plazo para docentes" },
  ].map((a) => ({ date: addDays(today, a.days), title: a.title, kind: a.kind, detail: a.detail }));

  // Antecedentes familiares: la madre lleva el 2° apellido del estudiante y el padre el 1°.
  const family = students.map((st, i) => {
    const mother = `${MOTHER_NAMES[i % MOTHER_NAMES.length]} ${st.secondLastName ?? MATERNAL_SURNAMES[i % 6]} ${MATERNAL_SURNAMES[(i + 2) % 6]}`;
    const father = `${FATHER_NAMES[i % FATHER_NAMES.length]} ${st.lastName} ${MATERNAL_SURNAMES[(i + 4) % 6]}`;
    return {
      studentId: st.id,
      guardianName: mother,
      guardianRelation: "Madre",
      guardianPhone: phone(rnd),
      guardianEmail: `${slug(mother.split(" ").slice(0, 2).join(" "))}@correo.cl`,
      guardianOccupation: OCCUPATIONS[i % OCCUPATIONS.length],
      substituteName: father,
      substituteRelation: "Padre",
      substitutePhone: phone(rnd),
      substituteOccupation: OCCUPATIONS[(i + 3) % OCCUPATIONS.length],
      address: `${STREETS[i % STREETS.length]} ${1200 + i * 41}`,
      commune: "Temuco",
      region: "La Araucanía",
      livesWith: LIVES_WITH[i % LIVES_WITH.length],
      health: HEALTH[i % HEALTH.length],
      healthInsurance: INSURANCE[i % INSURANCE.length],
      priority: i % 3 === 0,
      pie: i === 3 || i === 9,
      emergencyPhone: phone(rnd),
    };
  });

  return { lessons, attendance, evaluations, activities, family };
}

// Escribe los datos de ejemplo en la clase. `client` puede ser `db`, un `tx` de
// $transaction o el PrismaClient del seed.
export async function seedDemoClass(client, subjectId, students, now = new Date()) {
  const data = buildDemoData(students, now);

  await client.lesson.createMany({ data: data.lessons.map((l) => ({ ...l, subjectId })) });
  for (const s of data.attendance) {
    await client.attendanceSession.create({
      data: {
        subjectId,
        date: s.date,
        block: s.block,
        signedAt: s.signedAt,
        records: { createMany: { data: s.records } },
      },
    });
  }
  for (const ev of data.evaluations) {
    await client.evaluation.create({
      data: {
        subjectId,
        title: ev.title,
        date: ev.date,
        position: ev.position,
        grades: { createMany: { data: ev.grades } },
      },
    });
  }
  await client.activity.createMany({ data: data.activities.map((a) => ({ ...a, subjectId })) });
  await client.familyRecord.createMany({ data: data.family });
}
