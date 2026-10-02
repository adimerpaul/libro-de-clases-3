"use client";

import { usePathname, useRouter } from "next/navigation";
import { CalendarBlank } from "@phosphor-icons/react";
import { BLOCKS } from "@/lib/attendance";

// Elige día y bloque; la selección vive en la URL (?fecha=&bloque=).
export default function SlotPicker({ day, block, max }) {
  const router = useRouter();
  const pathname = usePathname();
  const go = (fecha, bloque) => router.push(`${pathname}?fecha=${fecha}&bloque=${bloque}`);
  const field = "rounded border border-neutral-300 bg-paper px-2 py-1 text-sm outline-none focus:border-accent";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-100 p-3 shadow-sm">
      <CalendarBlank weight="duotone" className="text-lg text-accent" />
      <input
        type="date"
        aria-label="Fecha"
        value={day}
        max={max}
        onChange={(e) => e.target.value && go(e.target.value, block)}
        className={field}
      />
      <select aria-label="Bloque" value={block} onChange={(e) => go(day, e.target.value)} className={field}>
        {BLOCKS.map((b) => (
          <option key={b} value={b}>
            {b}° bloque
          </option>
        ))}
      </select>
      {day !== max && (
        <button type="button" onClick={() => go(max, block)} className="text-xs text-accent-700 hover:underline">
          Ir a hoy
        </button>
      )}
    </div>
  );
}
