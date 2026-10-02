// Constantes y fechas de asistencia. Sin imports de servidor: lo usan páginas y componentes cliente.

export const STATUSES = ["P", "T", "A"];
export const STATUS_LABELS = { P: "Presente", T: "Atrasado", A: "Ausente" };
export const BLOCKS = [1, 2, 3, 4, 5, 6, 7, 8];

const TZ = "America/Santiago";

// Hoy en Chile como "YYYY-MM-DD" (en-CA formatea en ese orden).
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

// "YYYY-MM-DD" → Date a medianoche UTC, o null si es inválida o futura.
export function parseDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  if (value > todayISO()) return null;
  return date;
}

export function parseBlock(value) {
  const block = Number(value);
  return BLOCKS.includes(block) ? block : null;
}

// Porcentaje de asistencia: atrasados cuentan como presentes.
export function attendancePct(counts) {
  const total = counts.P + counts.T + counts.A;
  return total ? Math.round(((counts.P + counts.T) / total) * 1000) / 10 : null;
}

export function countStatuses(statuses) {
  const counts = { P: 0, T: 0, A: 0 };
  for (const s of statuses) if (s in counts) counts[s]++;
  return counts;
}

export function formatPct(pct) {
  return pct == null ? "—" : `${String(pct).replace(".", ",")}%`;
}
