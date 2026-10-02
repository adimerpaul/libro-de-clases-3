"use client";

import { useActionState, useRef } from "react";
import { PlusCircle } from "@phosphor-icons/react";
import { createSubject } from "@/app/actions/subjects";
import { COURSE_OPTIONS, DEFAULT_SUBJECT, SUBJECT_OPTIONS } from "@/lib/catalog";
import { FormError, inputClass } from "@/components/form-fields";

const TRIGGERS = {
  // Botón claro sobre el banner "Hola, …".
  banner:
    "flex items-center gap-1.5 rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-accent-800 hover:bg-accent-100",
  // Tarjeta punteada al final de la grilla de clases.
  card:
    "flex min-h-[132px] flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-neutral-500 text-sm text-accent-700 hover:bg-accent-100",
};

export default function CreateClassDialog({ variant = "banner", label = "Crear clase" }) {
  const dialogRef = useRef(null);
  const [state, action, pending] = useActionState(createSubject, undefined);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className={TRIGGERS[variant]}>
        <PlusCircle weight="duotone" className={variant === "card" ? "text-2xl" : "text-base"} />
        {label}
      </button>

      <dialog
        ref={dialogRef}
        // Cierra al hacer clic en el fondo.
        onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
        className="m-auto w-full max-w-md rounded-lg bg-neutral-100 p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <form action={action} className="flex flex-col gap-3 p-4">
          <h3 className="text-base font-semibold">Crear clase</h3>

          <label className="flex flex-col gap-1 text-xs font-semibold">
            Curso
            <select name="course" defaultValue={COURSE_OPTIONS[0]} className={inputClass}>
              {COURSE_OPTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Asignatura
            <select name="name" defaultValue={DEFAULT_SUBJECT.name} className={inputClass}>
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Horario
            <input name="schedule" placeholder="Lun 08:00 · Mié 11:30" className={inputClass} />
          </label>

          <FormError>{state?.error}</FormError>

          <div className="flex justify-end gap-2 text-sm">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-accent px-3 py-1.5 font-semibold text-white hover:bg-accent-600 disabled:opacity-45"
            >
              {pending ? "Creando…" : "Crear clase"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
