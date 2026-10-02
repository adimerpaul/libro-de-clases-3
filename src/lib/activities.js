// Tipos de actividad y helpers de calendario. Sin imports de servidor: lo usan páginas y componentes cliente.

export const ACTIVITY_KINDS = ["Evaluación", "Reunión", "Entrega", "Salida", "Feriado", "Plazo"];

// Clases de Tailwind por tipo (chip del calendario y etiqueta de la lista).
export const KIND_STYLES = {
  Evaluación: "bg-accent2-100 text-accent2-700",
  Reunión: "bg-accent-100 text-accent-800",
  Entrega: "bg-accent-100 text-accent-800",
  Salida: "bg-accent-100 text-accent-800",
  Feriado: "bg-neutral-200 text-neutral-700",
  Plazo: "bg-neutral-200 text-neutral-700",
};

export const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// "YYYY-MM" → { year, month (1-12) } o null.
export function parseMonth(value) {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return month >= 1 && month <= 12 && year >= 2000 && year <= 2100 ? { year, month } : null;
}

export function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth({ year, month }, delta) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

// Celdas del mes en semanas que empiezan el lunes. Cada celda: { iso, day, inMonth, weekend }.
export function monthGrid({ year, month }) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1, 1 - offset + i));
    return {
      iso: d.toISOString().slice(0, 10),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month - 1,
      weekend: i % 7 >= 5,
    };
  });
}
