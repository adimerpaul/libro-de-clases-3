"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { DotsThreeVertical, PencilSimple, Plus, Signature, Trash } from "@phosphor-icons/react";
import { deleteLesson, saveLesson, signLesson } from "@/app/actions/lessons";
import Modal from "@/components/modal";
import { FieldError, FormError, inputClass } from "@/components/form-fields";
import { BLOCKS } from "@/lib/attendance";

function Field({ label, error, className = "", children }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-semibold ${className}`}>
      {label}
      {children}
      <FieldError>{error}</FieldError>
    </label>
  );
}

function FormButtons({ onCancel, pending, label, pendingLabel, danger }) {
  return (
    <div className="flex justify-end gap-2 text-sm">
      <button type="button" onClick={onCancel} className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-200">
        Cancelar
      </button>
      <button
        type="submit"
        disabled={pending}
        className={`rounded px-3 py-1.5 font-semibold text-white disabled:opacity-45 ${
          danger ? "bg-accent2 hover:bg-accent2-700" : "bg-accent hover:bg-accent-600"
        }`}
      >
        {pending ? pendingLabel : label}
      </button>
    </div>
  );
}

// Cierra el modal cuando la acción del servidor responde ok.
function useActionForm(fn, onDone) {
  const [state, action, pending] = useActionState(fn, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return [state, action, pending];
}

function LessonForm({ subjectId, lesson, today, onDone }) {
  const [state, action, pending] = useActionForm(saveLesson, onDone);
  const v = state?.values ?? {
    date: lesson?.date ?? today,
    block: String(lesson?.block ?? 1),
    topic: lesson?.topic ?? "",
  };
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-3">
      {lesson ? <input type="hidden" name="id" value={lesson.id} /> : null}
      <input type="hidden" name="subjectId" value={subjectId} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Fecha" error={errors.date}>
          <input name="date" type="date" max={today} defaultValue={v.date} required className={inputClass} />
        </Field>
        <Field label="Bloque" error={errors.block}>
          <select name="block" defaultValue={v.block} className={inputClass}>
            {BLOCKS.map((b) => (
              <option key={b} value={b}>
                {b}° bloque
              </option>
            ))}
          </select>
        </Field>
        <Field label="Objetivo de aprendizaje y actividad" error={errors.topic} className="col-span-2">
          <textarea
            name="topic"
            defaultValue={v.topic}
            required
            rows={4}
            maxLength={500}
            placeholder="OA 3 · Describe la actividad realizada"
            className={`${inputClass} resize-y`}
          />
        </Field>
      </div>
      <FormError>{state?.error}</FormError>
      <FormButtons
        onCancel={onDone}
        pending={pending}
        label={lesson ? "Guardar cambios" : "Registrar"}
        pendingLabel="Guardando…"
      />
    </form>
  );
}

function ConfirmForm({ fn, lesson, onDone, children, label, pendingLabel, danger }) {
  const [state, action, pending] = useActionForm(fn, onDone);
  return (
    <form action={action} className="flex flex-col gap-3 text-sm">
      <input type="hidden" name="id" value={lesson.id} />
      {children}
      <FormError>{state?.error}</FormError>
      <FormButtons onCancel={onDone} pending={pending} label={label} pendingLabel={pendingLabel} danger={danger} />
    </form>
  );
}

export function NewLessonButton({ subjectId, today }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-600"
      >
        <Plus weight="bold" className="text-base" />
        Registrar clase
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar clase">
        <LessonForm subjectId={subjectId} today={today} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function MenuItem({ icon: Icon, children, danger, ...props }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] ${
        danger ? "text-accent2-700 hover:bg-accent2-100" : "hover:bg-accent-100"
      }`}
      {...props}
    >
      <Icon weight="duotone" className="text-[15px]" />
      {children}
    </button>
  );
}

// Menú ⋮ de una fila sin firmar (primera columna, a mano en el celular): firmar, editar y eliminar.
// Popover nativo: vive en la capa superior, así el overflow de la tabla no lo recorta.
export function LessonRowActions({ subjectId, lesson, label, today }) {
  const [mode, setMode] = useState(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const close = () => setMode(null);

  function toggle() {
    const r = buttonRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 2, left: r.left });
    menuRef.current.togglePopover();
  }
  const open = (m) => () => {
    menuRef.current.hidePopover();
    setMode(m);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        title="Opciones"
        aria-label={`Opciones de la clase del ${label}`}
        aria-haspopup="menu"
        className="grid size-7 place-items-center rounded text-base text-neutral-700 hover:bg-accent-100 hover:text-accent-700"
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
        <MenuItem icon={Signature} onClick={open("sign")}>
          Firmar clase
        </MenuItem>
        <MenuItem icon={PencilSimple} onClick={open("edit")}>
          Editar
        </MenuItem>
        <div className="my-1 border-t border-neutral-300" />
        <MenuItem icon={Trash} danger onClick={open("delete")}>
          Eliminar
        </MenuItem>
      </div>

      <Modal open={mode === "sign"} onClose={close} title="Firmar clase" className="max-w-sm">
        <ConfirmForm fn={signLesson} lesson={lesson} onDone={close} label="Firmar" pendingLabel="Firmando…">
          <p>
            Vas a firmar la clase del <strong>{label}</strong>. Una vez firmada no podrás editarla ni eliminarla.
          </p>
          <p className="rounded bg-neutral-200 px-2 py-1.5 text-[13px] whitespace-pre-line">{lesson.topic}</p>
        </ConfirmForm>
      </Modal>
      <Modal open={mode === "edit"} onClose={close} title="Editar registro de clase">
        <LessonForm subjectId={subjectId} lesson={lesson} today={today} onDone={close} />
      </Modal>
      <Modal open={mode === "delete"} onClose={close} title="Eliminar registro" className="max-w-sm">
        <ConfirmForm fn={deleteLesson} lesson={lesson} onDone={close} label="Eliminar" pendingLabel="Eliminando…" danger>
          <p>
            ¿Eliminar el registro de la clase del <strong>{label}</strong>? Queda archivado y no se borra
            definitivamente.
          </p>
        </ConfirmForm>
      </Modal>
    </>
  );
}
