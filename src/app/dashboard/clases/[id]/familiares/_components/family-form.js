"use client";

import { useActionState, useEffect, useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { saveFamily } from "@/app/actions/family";
import Modal from "@/components/modal";
import { FieldError, FormError, inputClass } from "@/components/form-fields";
import { FAMILY_BOOLEANS, FAMILY_TEXTS, RELATIONS } from "@/lib/family";

function Field({ label, error, className = "", children }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-semibold ${className}`}>
      {label}
      {children}
      <FieldError>{error}</FieldError>
    </label>
  );
}

function Section({ title, children }) {
  return (
    <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <legend className="mb-1 text-[10px] tracking-widest text-neutral-700 uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

function FamilyForm({ studentId, family, onDone }) {
  const [state, action, pending] = useActionState(saveFamily, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const v =
    state?.values ??
    Object.fromEntries([
      ...FAMILY_TEXTS.map((k) => [k, family?.[k] ?? ""]),
      ...FAMILY_BOOLEANS.map((k) => [k, family?.[k] ?? false]),
    ]);
  const errors = state?.errors ?? {};
  const text = (name, label, { wide, ...props } = {}) => (
    <Field label={label} error={errors[name]} className={wide ? "sm:col-span-2" : ""}>
      <input name={name} defaultValue={v[name]} maxLength={200} className={inputClass} {...props} />
    </Field>
  );
  const relation = (name) => (
    <Field label="Parentesco" error={errors[name]}>
      <input name={name} defaultValue={v[name]} list="relations" maxLength={200} className={inputClass} />
    </Field>
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="studentId" value={studentId} />
      <datalist id="relations">
        {RELATIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <Section title="Apoderado titular">
        {text("guardianName", "Nombre completo", { wide: true })}
        {relation("guardianRelation")}
        {text("guardianPhone", "Teléfono", { type: "tel", placeholder: "+56 9 1234 5678" })}
        {text("guardianEmail", "Correo", { type: "email" })}
        {text("guardianOccupation", "Ocupación")}
      </Section>

      <Section title="Apoderado suplente">
        {text("substituteName", "Nombre completo", { wide: true })}
        {relation("substituteRelation")}
        {text("substitutePhone", "Teléfono", { type: "tel", placeholder: "+56 9 1234 5678" })}
        {text("substituteOccupation", "Ocupación")}
      </Section>

      <Section title="Domicilio">
        {text("address", "Dirección", { wide: true })}
        {text("commune", "Comuna")}
        {text("region", "Región")}
        {text("livesWith", "Vive con", { wide: true, placeholder: "Madre, padre y 1 hermano" })}
      </Section>

      <Section title="Salud y programas">
        {text("health", "Antecedentes de salud", { wide: true, placeholder: "Alergias, enfermedades, medicamentos…" })}
        {text("healthInsurance", "Previsión", { placeholder: "Fonasa B, Isapre…" })}
        {text("emergencyPhone", "Teléfono de emergencia", { type: "tel" })}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="priority" defaultChecked={v.priority} />
          Estudiante prioritario
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pie" defaultChecked={v.pie} />
          Programa de Integración Escolar (PIE)
        </label>
      </Section>

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
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export default function EditFamilyButton({ studentId, studentName, family }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded border border-neutral-300 px-3 py-1.5 text-sm font-semibold hover:bg-accent-100"
      >
        <PencilSimple weight="duotone" className="text-base text-accent" />
        {family ? "Editar" : "Completar ficha"}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Antecedentes familiares · ${studentName}`}
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
      >
        <FamilyForm studentId={studentId} family={family} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
