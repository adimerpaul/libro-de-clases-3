"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { DotsThreeVertical, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { deleteEvaluation, saveEvaluation } from "@/app/actions/grades";
import Modal from "@/components/modal";
import { FieldError, FormError, inputClass } from "@/components/form-fields";

function EvaluationForm({ subjectId, evaluation, onDone }) {
  const [state, action, pending] = useActionState(saveEvaluation, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const v = state?.values ?? { title: evaluation?.title ?? "", date: evaluation?.date ?? "" };
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-3">
      {evaluation ? <input type="hidden" name="id" value={evaluation.id} /> : null}
      <input type="hidden" name="subjectId" value={subjectId} />
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Nombre
        <input
          name="title"
          defaultValue={v.title}
          placeholder="Prueba Unidad 1"
          maxLength={60}
          required
          autoFocus
          className={inputClass}
        />
        <FieldError>{errors.title}</FieldError>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Fecha (opcional)
        <input name="date" type="date" defaultValue={v.date} className={inputClass} />
        <FieldError>{errors.date}</FieldError>
      </label>
      <FormError>{state?.error}</FormError>
      <div className="flex justify-end gap-2 text-sm">
        <button type="button" onClick={onDone} className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-200">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-3 py-1.5 font-semibold text-white hover:bg-accent-600 disabled:opacity-45"
        >
          {pending ? "Guardando…" : evaluation ? "Guardar" : "Crear evaluación"}
        </button>
      </div>
    </form>
  );
}

function DeleteEvaluationForm({ evaluation, label, onDone }) {
  const [state, action, pending] = useActionState(deleteEvaluation, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-3 text-sm">
      <input type="hidden" name="id" value={evaluation.id} />
      <p>
        ¿Eliminar la evaluación{" "}
        <strong>
          {label} · {evaluation.title}
        </strong>
        ? Sus notas dejan de contar en los promedios; quedan archivadas, no se borran definitivamente.
      </p>
      <FormError>{state?.error}</FormError>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-200">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent2 px-3 py-1.5 font-semibold text-white hover:bg-accent2-700 disabled:opacity-45"
        >
          {pending ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </form>
  );
}

export function NewEvaluationButton({ subjectId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-600"
      >
        <Plus weight="bold" className="text-sm" />
        Nueva evaluación
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva evaluación" className="max-w-sm">
        <EvaluationForm subjectId={subjectId} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

// Menú ⋮ de una columna (popover nativo: no lo recorta el overflow de la tabla).
export function EvaluationMenu({ subjectId, evaluation, label }) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mode, setMode] = useState(null); // "edit" | "delete" | null
  const close = () => setMode(null);

  function toggle() {
    const r = buttonRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 2, left: Math.max(4, r.right - 160) });
    menuRef.current.togglePopover();
  }
  const open = (m) => () => {
    menuRef.current.hidePopover();
    setMode(m);
  };
  const item = "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[13px] font-normal";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        title="Opciones de la evaluación"
        aria-label={`Opciones de ${label}`}
        aria-haspopup="menu"
        className="grid size-5 place-items-center rounded text-sm text-neutral-700 hover:bg-accent-100 hover:text-accent-700"
      >
        <DotsThreeVertical weight="bold" />
      </button>
      <div
        ref={menuRef}
        popover="auto"
        role="menu"
        style={{ position: "fixed", inset: "auto", top: pos.top, left: pos.left, margin: 0 }}
        className="w-40 rounded-lg border border-neutral-300 bg-neutral-100 p-1 text-ink shadow-lg"
      >
        <button type="button" role="menuitem" onClick={open("edit")} className={`${item} hover:bg-accent-100`}>
          <PencilSimple weight="duotone" className="text-[15px]" />
          Editar
        </button>
        <button type="button" role="menuitem" onClick={open("delete")} className={`${item} text-accent2-700 hover:bg-accent2-100`}>
          <Trash weight="duotone" className="text-[15px]" />
          Eliminar
        </button>
      </div>
      <Modal open={mode === "edit"} onClose={close} title={`Editar ${label}`} className="max-w-sm">
        <EvaluationForm subjectId={subjectId} evaluation={evaluation} onDone={close} />
      </Modal>
      <Modal open={mode === "delete"} onClose={close} title="Eliminar evaluación" className="max-w-sm">
        <DeleteEvaluationForm evaluation={evaluation} label={label} onDone={close} />
      </Modal>
    </>
  );
}
