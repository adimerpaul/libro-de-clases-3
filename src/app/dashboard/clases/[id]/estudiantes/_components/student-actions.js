"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, UserPlus } from "@phosphor-icons/react";
import { deleteStudent, saveStudent } from "@/app/actions/students";
import Modal from "@/components/modal";
import { FieldError, FormError, inputClass } from "@/components/form-fields";
import StudentAvatar from "./student-avatar";

export const MAX_PHOTO_MB = 5;

// Validación en el navegador (el servidor vuelve a validar).
export function checkPhotoFile(file) {
  if (!file.type.startsWith("image/")) return "El archivo debe ser una imagen.";
  if (file.size > MAX_PHOTO_MB * 1024 * 1024) return `La foto no puede superar ${MAX_PHOTO_MB} MB.`;
  return null;
}

// ¿El arrastre trae archivos? (no reaccionar a texto o enlaces arrastrados).
export function isFileDrag(e) {
  return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}

function Field({ label, error, className = "", children }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-semibold ${className}`}>
      {label}
      {children}
      <FieldError>{error}</FieldError>
    </label>
  );
}

function StudentForm({ subjectId, student, onDone }) {
  const [state, action, pending] = useActionState(saveStudent, undefined);
  const [preview, setPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const v = state?.values ?? {
    firstName: student?.firstName ?? "",
    lastName: student?.lastName ?? "",
    secondLastName: student?.secondLastName ?? "",
    rut: student?.rut ?? "",
    birthDate: student?.birthDate ? student.birthDate.toISOString().slice(0, 10) : "",
  };
  const errors = state?.errors ?? {};

  function pickPhoto(file) {
    setPhotoError(null);
    if (!file) return setPreview(null);
    const error = checkPhotoFile(file);
    if (error) {
      fileRef.current.value = "";
      setPreview(null);
      return setPhotoError(error);
    }
    setRemovePhoto(false);
    setPreview(URL.createObjectURL(file));
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    // Mete el archivo soltado en el <input type=file> para que viaje con el formulario.
    const dt = new DataTransfer();
    dt.items.add(file);
    fileRef.current.files = dt.files;
    pickPhoto(file);
  }

  const showCurrent = student?.photo && !removePhoto && !preview;

  return (
    <form action={action} className="flex flex-col gap-3">
      {student ? <input type="hidden" name="id" value={student.id} /> : null}
      <input type="hidden" name="subjectId" value={subjectId} />

      <div
        onDragOver={(e) => {
          if (!isFileDrag(e)) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDragging(false)}
        onDrop={onDrop}
        className={`flex items-center gap-3 rounded border border-dashed p-2 transition-colors ${
          dragging ? "border-accent bg-accent-100" : "border-neutral-300"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-14 rounded-full object-cover" />
        ) : showCurrent ? (
          <StudentAvatar student={student} size={56} />
        ) : (
          <span className="grid size-14 flex-none place-items-center rounded-full bg-neutral-200 text-2xl text-neutral-500">
            <Camera weight="duotone" />
          </span>
        )}
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-neutral-700">
            {dragging ? "Suelta la imagen aquí" : "Arrastra una foto aquí o"}
          </span>
          <label className="w-fit cursor-pointer rounded border border-neutral-300 bg-neutral-100 px-2 py-1 font-semibold hover:bg-accent-100">
            {student?.photo || preview ? "Cambiar foto" : "Elegir archivo"}
            <input
              ref={fileRef}
              name="photo"
              type="file"
              accept="image/*"
              onChange={(e) => pickPhoto(e.target.files?.[0])}
              className="sr-only"
            />
          </label>
          {student?.photo && !preview && (
            <label className="flex items-center gap-1 text-neutral-700">
              <input
                type="checkbox"
                name="removePhoto"
                checked={removePhoto}
                onChange={(e) => setRemovePhoto(e.target.checked)}
              />
              Quitar foto
            </label>
          )}
          <span className="text-neutral-500">JPG, PNG o WebP hasta {MAX_PHOTO_MB} MB · se guarda como WebP</span>
          <FieldError>{photoError ?? errors.photo}</FieldError>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Nombres" error={errors.firstName} className="col-span-2">
          <input name="firstName" defaultValue={v.firstName} required className={inputClass} />
        </Field>
        <Field label="Apellido paterno" error={errors.lastName}>
          <input name="lastName" defaultValue={v.lastName} required className={inputClass} />
        </Field>
        <Field label="Apellido materno">
          <input name="secondLastName" defaultValue={v.secondLastName ?? ""} className={inputClass} />
        </Field>
        <Field label="RUN" error={errors.rut}>
          <input name="rut" defaultValue={v.rut ?? ""} placeholder="21.234.567-8" className={inputClass} />
        </Field>
        <Field label="Nacimiento" error={errors.birthDate}>
          <input name="birthDate" type="date" defaultValue={v.birthDate} className={inputClass} />
        </Field>
      </div>

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
          {pending ? "Guardando…" : student ? "Guardar cambios" : "Matricular"}
        </button>
      </div>
    </form>
  );
}

export function NewStudentButton({ subjectId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-600"
      >
        <UserPlus weight="duotone" className="text-base" />
        Matricular
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Matricular estudiante">
        <StudentForm subjectId={subjectId} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function DeleteForm({ student, onDone }) {
  const [state, action, pending] = useActionState(deleteStudent, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-3 text-sm">
      <input type="hidden" name="id" value={student.id} />
      <p>
        ¿Eliminar a{" "}
        <strong>
          {student.firstName} {student.lastName} {student.secondLastName}
        </strong>{" "}
        de la clase? Su registro queda archivado y no se borra definitivamente.
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

// Modales de editar/eliminar que abre el menú ⋮ de cada fila.
export function StudentModals({ subjectId, student, mode, onClose }) {
  return (
    <>
      <Modal open={mode === "edit"} onClose={onClose} title="Editar estudiante">
        <StudentForm subjectId={subjectId} student={student} onDone={onClose} />
      </Modal>
      <Modal open={mode === "delete"} onClose={onClose} title="Eliminar estudiante" className="max-w-sm">
        <DeleteForm student={student} onDone={onClose} />
      </Modal>
    </>
  );
}
