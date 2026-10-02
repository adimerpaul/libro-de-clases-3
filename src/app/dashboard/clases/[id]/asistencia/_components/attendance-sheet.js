"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Checks, LockSimple, Signature, WarningCircle } from "@phosphor-icons/react";
import { markAttendance, signAttendance } from "@/app/actions/attendance";
import Modal from "@/components/modal";
import { STATUS_LABELS, STATUSES } from "@/lib/attendance";
import StudentAvatar from "../../estudiantes/_components/student-avatar";

const ON_STYLES = {
  P: "border-accent bg-accent text-white",
  T: "border-amber-400 bg-amber-400 text-ink",
  A: "border-accent2 bg-accent2 text-white",
};
const DOT = { P: "bg-accent", T: "bg-amber-400", A: "bg-accent2" };
const PLURAL = { P: "Presentes", T: "Atrasados", A: "Ausentes" };

const timeFmt = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

export default function AttendanceSheet({ subjectId, day, block, title, students, initialMarks, signedAt }) {
  const [marks, setMarks] = useState(initialMarks);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saving, startSaving] = useTransition();
  const [signing, startSigning] = useTransition();
  const locked = Boolean(signedAt);

  const counts = { P: 0, T: 0, A: 0 };
  for (const st of students) if (marks[st.id]) counts[marks[st.id]]++;
  const unmarked = students.filter((st) => !marks[st.id]);

  // Aplica en pantalla al instante y revierte si el servidor rechaza.
  function save(changes) {
    const previous = marks;
    setMarks((m) => ({ ...m, ...changes }));
    setError(null);
    setSaved(false);
    startSaving(async () => {
      const res = await markAttendance(subjectId, day, block, changes);
      if (res?.error) {
        setMarks(previous);
        setError(res.error);
      } else {
        setSaved(true);
      }
    });
  }

  function sign() {
    startSigning(async () => {
      const res = await signAttendance(subjectId, day, block);
      setConfirm(false);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
        {STATUSES.map((s) => (
          <div key={s} className="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 shadow-sm">
            <span className={`size-2.5 rounded-full ${DOT[s]}`} />
            <span className="flex-1 text-sm">{PLURAL[s]}</span>
            <span className="text-2xl font-semibold">{counts[s]}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 shadow-sm">
          <span className="size-2.5 rounded-full border border-neutral-500" />
          <span className="flex-1 text-sm">Sin marcar</span>
          <span className="text-2xl font-semibold">{unmarked.length}</span>
        </div>
      </div>

      <section className="flex flex-col gap-2 rounded-lg bg-neutral-100 p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[220px] flex-1">
            <h3 className="leading-tight font-semibold first-letter:uppercase">{title}</h3>
            <p className="flex items-center gap-1 text-xs text-neutral-700">
              {locked ? (
                <>
                  <LockSimple weight="duotone" />
                  Firmada el {timeFmt.format(new Date(signedAt))} · ya no se puede modificar
                </>
              ) : saving ? (
                "Guardando…"
              ) : saved ? (
                <>
                  <CheckCircle weight="duotone" className="text-accent" />
                  Guardado
                </>
              ) : (
                "Marca a cada estudiante. Se guarda automáticamente."
              )}
            </p>
          </div>
          {!locked && (
            <>
              <button
                type="button"
                disabled={!unmarked.length || saving}
                onClick={() => save(Object.fromEntries(unmarked.map((st) => [st.id, "P"])))}
                className="flex items-center gap-1.5 rounded border border-accent px-3 py-1.5 text-sm text-accent-700 hover:bg-accent-100 disabled:opacity-40"
              >
                <Checks weight="duotone" className="text-lg" />
                {unmarked.length === students.length ? "Todos presentes" : "Resto presentes"}
              </button>
              <button
                type="button"
                disabled={unmarked.length > 0 || saving || !students.length}
                title={unmarked.length ? "Marca a todos los estudiantes para firmar" : undefined}
                onClick={() => setConfirm(true)}
                className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-40"
              >
                <Signature weight="duotone" className="text-lg" />
                Cerrar y firmar
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="flex items-center gap-1.5 rounded bg-accent2-100 px-2 py-1 text-sm text-accent2-700">
            <WarningCircle weight="duotone" />
            {error}
          </p>
        )}

        {students.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-700">Esta clase todavía no tiene estudiantes.</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-1">
            {students.map((st) => (
              <li key={st.id} className="flex items-center gap-2 rounded bg-paper px-2 py-1">
                <span className="w-5 text-xs text-neutral-700">{st.listNumber}</span>
                <StudentAvatar student={st} />
                <span className="min-w-0 flex-1 truncate text-[13px]">{st.name}</span>
                <div role="radiogroup" aria-label={`Asistencia de ${st.name}`} className="flex gap-1">
                  {STATUSES.map((s) => {
                    const on = marks[st.id] === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        title={STATUS_LABELS[s]}
                        disabled={locked}
                        onClick={() => !on && save({ [st.id]: s })}
                        className={`h-7 w-8 rounded border text-xs font-semibold ${
                          on ? ON_STYLES[s] : "border-neutral-300 text-neutral-700 enabled:hover:bg-accent-100"
                        } disabled:cursor-default ${locked && !on ? "opacity-40" : ""}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Cerrar y firmar asistencia">
        <p className="text-sm">
          Vas a firmar la asistencia del {title}: {counts.P} presentes, {counts.T} atrasados y {counts.A} ausentes.
          Después de firmar no podrás modificarla.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirm(false)}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={signing}
            onClick={sign}
            className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
          >
            <Signature weight="duotone" />
            {signing ? "Firmando…" : "Firmar"}
          </button>
        </div>
      </Modal>
    </>
  );
}
