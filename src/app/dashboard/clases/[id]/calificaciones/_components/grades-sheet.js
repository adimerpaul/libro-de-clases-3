"use client";

import { useRef, useState, useTransition } from "react";
import { Exam } from "@phosphor-icons/react";
import { saveGrade } from "@/app/actions/grades";
import { average, formatGrade, isFailing, parseGrade } from "@/lib/grades";
import { EvaluationMenu, NewEvaluationButton } from "./evaluation-actions";

const dateFmt = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

function AvgPill({ value }) {
  if (value == null) return <span className="text-neutral-500">—</span>;
  const tone = isFailing(value) ? "bg-accent2-100 text-accent2-700" : "bg-accent-100 text-accent-800";
  return <span className={`inline-block min-w-9 rounded px-1.5 py-px font-semibold ${tone}`}>{formatGrade(value)}</span>;
}

// Celda editable. Guarda al salir (blur) o con Enter; Esc deshace lo escrito.
function GradeCell({ text, status, onChange, onCommit, onRevert, onMove, cellId }) {
  return (
    <input
      id={cellId}
      value={text}
      inputMode="decimal"
      autoComplete="off"
      aria-invalid={status?.error ? true : undefined}
      title={status?.error}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "ArrowDown") {
          e.preventDefault();
          onMove(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          onMove(-1);
        } else if (e.key === "Escape") {
          onRevert();
        }
      }}
      className={`w-11 rounded border px-1 py-0.5 text-center outline-none focus:border-accent focus:bg-paper ${
        status?.error
          ? "border-accent2 bg-accent2-100"
          : text === ""
            ? "border-dashed border-neutral-300 bg-transparent hover:border-accent" // vacía: que se note que se puede escribir
            : "border-transparent bg-transparent hover:border-neutral-300"
      } ${isFailing(parseGrade(text).value) ? "text-accent2-700" : ""} ${status?.saving ? "opacity-50" : ""}`}
    />
  );
}

export default function GradesSheet({ subjectId, subjectName, students, evaluations, grades }) {
  // Texto de cada celda que el docente modificó (lo no tocado se lee de `grades`).
  const [edits, setEdits] = useState({});
  // Último valor confirmado por el servidor para cada celda guardada en esta sesión.
  const [saved, setSaved] = useState({});
  const [status, setStatus] = useState({}); // { key: { saving } | { error } }
  const [, startTransition] = useTransition();
  const tableRef = useRef(null);

  const serverValue = (key) => (key in saved ? saved[key] : (grades[key] ?? null));
  const textOf = (key) => (key in edits ? edits[key] : formatGrade(serverValue(key)));
  const valueOf = (key) => {
    const p = parseGrade(textOf(key));
    return p.error ? serverValue(key) : p.value;
  };

  const labels = evaluations.map((_, i) => `N${i + 1}`);
  const studentAvg = (st) => average(evaluations.map((ev) => valueOf(`${ev.id}:${st.id}`)));
  const evalAvg = (ev) => average(students.map((st) => valueOf(`${ev.id}:${st.id}`)));
  const courseAvg = average(students.map(studentAvg));
  const failingCount = students.filter((st) => isFailing(studentAvg(st))).length;

  function commit(evaluationId, studentId) {
    const key = `${evaluationId}:${studentId}`;
    if (!(key in edits)) return;
    const parsed = parseGrade(edits[key]);
    if (parsed.error) return setStatus((s) => ({ ...s, [key]: { error: parsed.error } }));
    if (parsed.value === serverValue(key)) {
      // Sin cambios reales: solo normaliza el texto ("55" → "5,5").
      setEdits(({ [key]: _, ...rest }) => rest);
      return setStatus(({ [key]: __, ...rest }) => rest);
    }
    setEdits((e) => ({ ...e, [key]: formatGrade(parsed.value) }));
    setStatus((s) => ({ ...s, [key]: { saving: true } }));
    startTransition(async () => {
      const res = await saveGrade({ evaluationId, studentId, raw: edits[key] }).catch(() => ({
        error: "No se pudo guardar. Revisa tu conexión.",
      }));
      if (res?.error) return setStatus((s) => ({ ...s, [key]: { error: res.error } }));
      setSaved((v) => ({ ...v, [key]: res.value }));
      // Si mientras se guardaba volvió a escribir en la celda, no le pisamos el texto nuevo.
      setEdits((e) => {
        if (e[key] !== formatGrade(res.value)) return e;
        const { [key]: _, ...rest } = e;
        return rest;
      });
      setStatus(({ [key]: __, ...rest }) => rest);
    });
  }

  function move(evIndex, stIndex, delta) {
    const next = stIndex + delta;
    if (next < 0 || next >= students.length) return;
    tableRef.current?.querySelector(`#g-${evaluations[evIndex].id}-${students[next].id}`)?.focus();
  }

  const pendingErrors = Object.values(status).filter((s) => s.error).length;

  return (
    <div className="flex min-h-0 flex-col gap-2 rounded-lg bg-neutral-100 p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="min-w-[200px] flex-1 leading-tight">
          <h3 className="font-semibold">{subjectName} · Calificaciones</h3>
          <p className="text-xs text-neutral-700">
            Escala 1,0 a 7,0 · Aprobación 4,0 · Escribe «55» o «5,5» y pasa con Enter
          </p>
        </div>
        {failingCount > 0 && (
          <span className="rounded bg-accent2-100 px-1.5 py-0.5 text-xs text-accent2-700">
            {failingCount} con promedio bajo 4,0
          </span>
        )}
        <span className="text-sm">
          Promedio del curso <AvgPill value={courseAvg} />
        </span>
        <NewEvaluationButton subjectId={subjectId} />
      </div>

      {pendingErrors > 0 && (
        <p role="alert" className="rounded bg-accent2-100 px-2 py-1 text-xs text-accent2-700">
          {pendingErrors === 1 ? "Hay 1 nota sin guardar" : `Hay ${pendingErrors} notas sin guardar`}: revisa las celdas
          marcadas en rojo (pasa el mouse para ver el detalle).
        </p>
      )}

      {students.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-700">Esta clase todavía no tiene estudiantes.</p>
      ) : evaluations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-neutral-700">
          <Exam weight="duotone" className="text-3xl text-accent" />
          Aún no hay evaluaciones. Crea la primera con «Nueva evaluación».
        </div>
      ) : (
        <div className="overflow-auto">
          <table ref={tableRef} className="w-full text-left text-[13px] leading-tight">
            <thead className="sticky top-0 z-[1] bg-neutral-200 text-xs text-neutral-700">
              <tr>
                <th className="w-8 px-2 py-1 font-semibold">N°</th>
                <th className="min-w-[180px] px-2 py-1 font-semibold">Estudiante</th>
                {evaluations.map((ev, i) => (
                  <th key={ev.id} className="w-14 px-1 py-1 text-center font-semibold" title={ev.title}>
                    <div className="flex items-center justify-center gap-0.5">
                      {labels[i]}
                      <EvaluationMenu subjectId={subjectId} evaluation={ev} label={labels[i]} />
                    </div>
                    <div className="max-w-16 truncate text-[10px] font-normal">
                      {ev.date ? dateFmt.format(new Date(`${ev.date}T00:00:00Z`)).replaceAll("-", "/") : ev.title}
                    </div>
                  </th>
                ))}
                <th className="w-16 px-2 py-1 text-center font-semibold">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {students.map((st, si) => (
                <tr key={st.id} className="border-b border-neutral-200 hover:bg-accent-100/50">
                  <td className="px-2 py-px text-neutral-700">{st.listNumber}</td>
                  <td className="truncate px-2 py-px">{st.name}</td>
                  {evaluations.map((ev, ei) => {
                    const key = `${ev.id}:${st.id}`;
                    return (
                      <td key={ev.id} className="px-1 py-px text-center">
                        <GradeCell
                          cellId={`g-${ev.id}-${st.id}`}
                          text={textOf(key)}
                          status={status[key]}
                          onChange={(t) => {
                            setEdits((e) => ({ ...e, [key]: t }));
                            if (status[key]?.error) setStatus(({ [key]: _, ...rest }) => rest);
                          }}
                          onCommit={() => commit(ev.id, st.id)}
                          onRevert={() => {
                            setEdits(({ [key]: _, ...rest }) => rest);
                            setStatus(({ [key]: __, ...rest }) => rest);
                          }}
                          onMove={(d) => move(ei, si, d)}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-px text-center">
                    <AvgPill value={studentAvg(st)} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-200 text-xs">
              <tr>
                <td />
                <td className="px-2 py-1 font-semibold text-neutral-700">Promedio por evaluación</td>
                {evaluations.map((ev) => (
                  <td key={ev.id} className="px-1 py-1 text-center">
                    <AvgPill value={evalAvg(ev)} />
                  </td>
                ))}
                <td className="px-2 py-1 text-center">
                  <AvgPill value={courseAvg} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
