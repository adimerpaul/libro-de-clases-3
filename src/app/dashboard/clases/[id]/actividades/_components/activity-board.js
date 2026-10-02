"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { deleteActivity, saveActivity } from "@/app/actions/activities";
import Modal from "@/components/modal";
import { FieldError, FormError, inputClass } from "@/components/form-fields";
import { ACTIVITY_KINDS, KIND_STYLES, WEEKDAYS } from "@/lib/activities";

const dayFmt = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const monthShort = new Intl.DateTimeFormat("es-CL", { month: "short", timeZone: "UTC" });
const toDate = (iso) => new Date(`${iso}T00:00:00Z`);

function Field({ label, error, className = "", children }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-semibold ${className}`}>
      {label}
      {children}
      <FieldError>{error}</FieldError>
    </label>
  );
}

function ActivityForm({ subjectId, activity, onDone }) {
  const [state, action, pending] = useActionState(saveActivity, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const v = state?.values ?? activity;
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="subjectId" value={subjectId} />
      {activity.id && <input type="hidden" name="id" value={activity.id} />}
      <Field label="Título" error={errors.title}>
        <input name="title" defaultValue={v.title} required maxLength={120} autoFocus className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha" error={errors.date}>
          <input type="date" name="date" defaultValue={v.date} required className={inputClass} />
        </Field>
        <Field label="Tipo" error={errors.kind}>
          <select name="kind" defaultValue={v.kind} className={inputClass}>
            {ACTIVITY_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Detalle (opcional)" error={errors.detail}>
        <textarea
          name="detail"
          defaultValue={v.detail}
          maxLength={300}
          rows={2}
          placeholder="Hora, sala, contenidos…"
          className={inputClass}
        />
      </Field>
      <FormError>{state?.error}</FormError>
      <div className="flex justify-end gap-2 text-sm">
        <button type="button" onClick={onDone} className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-200">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-3 py-1.5 font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function DeleteForm({ activity, onDone }) {
  const [state, action, pending] = useActionState(deleteActivity, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-3 text-sm">
      <input type="hidden" name="id" value={activity.id} />
      <p>
        ¿Eliminar «{activity.title}» del {dayFmt.format(toDate(activity.date))}?
      </p>
      <FormError>{state?.error}</FormError>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-200">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent2 px-3 py-1.5 font-semibold text-white hover:bg-accent2-700 disabled:opacity-50"
        >
          {pending ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </form>
  );
}

export default function ActivityBoard({
  subjectId,
  title,
  cells,
  today,
  prevHref,
  nextHref,
  todayHref,
  activities,
}) {
  // { mode: "edit" | "delete", activity } — activity sin id = nueva.
  const [dialog, setDialog] = useState(null);
  const close = () => setDialog(null);
  const openNew = (date) => setDialog({ mode: "edit", activity: { title: "", kind: "Evaluación", date, detail: "" } });

  const byDay = new Map();
  for (const a of activities) byDay.set(a.date, [...(byDay.get(a.date) ?? []), a]);
  const monthCells = cells.filter((c) => c.inMonth);
  const inMonth = activities.filter((a) => monthCells.some((c) => c.iso === a.date));
  const defaultDay = monthCells.some((c) => c.iso === today) ? today : monthCells[0].iso;
  const navBtn = "grid size-7 place-items-center rounded border border-neutral-300 hover:bg-accent-100";

  return (
    <div className="grid items-start gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <section className="flex min-w-0 flex-col gap-2 rounded-lg bg-neutral-100 p-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <h3 className="flex-1 leading-tight font-semibold first-letter:uppercase">{title}</h3>
          {todayHref && (
            <Link href={todayHref} className="mr-1 text-xs text-accent-700 hover:underline">
              Hoy
            </Link>
          )}
          <Link href={prevHref} title="Mes anterior" className={navBtn}>
            <CaretLeft weight="duotone" />
          </Link>
          <Link href={nextHref} title="Mes siguiente" className={navBtn}>
            <CaretRight weight="duotone" />
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-1 text-[10px] tracking-widest text-neutral-700 uppercase">
              {w}
            </div>
          ))}
          {cells.map((c) => (
            <div
              key={c.iso}
              role="button"
              tabIndex={0}
              title="Agregar actividad"
              onClick={() => openNew(c.iso)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openNew(c.iso))}
              className={`group flex min-h-20 min-w-0 cursor-pointer flex-col gap-0.5 overflow-hidden rounded p-1 hover:ring-1 hover:ring-accent ${
                c.iso === today ? "bg-accent-100" : c.inMonth ? "bg-paper" : ""
              }`}
            >
              <span
                className={`flex items-center text-xs ${c.iso === today ? "font-semibold" : ""} ${
                  !c.inMonth ? "text-neutral-500" : c.weekend ? "text-accent2-700" : ""
                }`}
              >
                {c.day}
                <Plus weight="bold" className="ml-auto hidden text-accent group-hover:block" />
              </span>
              {(byDay.get(c.iso) ?? []).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  title={a.detail ? `${a.title} · ${a.detail}` : a.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDialog({ mode: "edit", activity: a });
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  className={`truncate rounded-sm px-1 py-px text-left text-[11px] leading-tight ${KIND_STYLES[a.kind]} ${
                    c.inMonth ? "" : "opacity-50"
                  }`}
                >
                  {a.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-1 rounded-lg bg-neutral-100 p-3 shadow-sm">
        <div className="flex items-center">
          <h3 className="flex-1 leading-tight font-semibold">Este mes</h3>
          <button
            type="button"
            onClick={() => openNew(defaultDay)}
            className="flex items-center gap-1 rounded bg-accent px-2.5 py-1 text-sm font-semibold text-white hover:bg-accent-600"
          >
            <Plus weight="bold" />
            Nueva
          </button>
        </div>
        {inMonth.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-700">
            No hay actividades este mes. Haz clic en un día del calendario para agregar una.
          </p>
        ) : (
          <ul className="flex flex-col">
            {inMonth.map((a) => {
              const d = toDate(a.date);
              return (
                <li key={a.id} className="group flex items-center gap-2 border-b border-neutral-200 py-1.5">
                  <div className={`w-10 flex-none text-center leading-none ${a.date < today ? "opacity-50" : ""}`}>
                    <div className="text-lg font-semibold">{d.getUTCDate()}</div>
                    <div className="text-[10px] text-neutral-700 uppercase">{monthShort.format(d).replace(".", "")}</div>
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-sm">{a.title}</div>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-700">
                      <span className={`rounded-sm px-1 ${KIND_STYLES[a.kind]}`}>{a.kind}</span>
                      <span className="truncate">{a.detail}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => setDialog({ mode: "edit", activity: a })}
                    className="grid size-7 place-items-center rounded text-neutral-700 hover:bg-accent-100 hover:text-accent-700"
                  >
                    <PencilSimple weight="duotone" />
                  </button>
                  <button
                    type="button"
                    title="Eliminar"
                    onClick={() => setDialog({ mode: "delete", activity: a })}
                    className="grid size-7 place-items-center rounded text-neutral-700 hover:bg-accent2-100 hover:text-accent2-700"
                  >
                    <Trash weight="duotone" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal
        open={dialog?.mode === "edit"}
        onClose={close}
        title={dialog?.activity?.id ? "Editar actividad" : "Nueva actividad"}
      >
        {dialog?.mode === "edit" && <ActivityForm subjectId={subjectId} activity={dialog.activity} onDone={close} />}
      </Modal>
      <Modal open={dialog?.mode === "delete"} onClose={close} title="Eliminar actividad" className="max-w-sm">
        {dialog?.mode === "delete" && <DeleteForm activity={dialog.activity} onDone={close} />}
      </Modal>
    </div>
  );
}
