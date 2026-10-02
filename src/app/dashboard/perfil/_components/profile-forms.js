"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle } from "@phosphor-icons/react";
import { changePassword, updateProfile } from "@/app/actions/profile";
import { FieldError, FormError, PasswordInput, inputClass } from "@/components/form-fields";
import { PASSWORD_HINT } from "@/lib/password";
import { UserAvatar } from "../../_components/user-menu";

const MAX_PHOTO_MB = 5;

function Field({ label, error, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold">
      {label}
      {children}
      <FieldError>{error}</FieldError>
    </label>
  );
}

function Success({ children }) {
  if (!children) return null;
  return (
    <p role="status" className="flex items-center gap-1.5 rounded bg-accent-100 px-2 py-1.5 text-sm text-accent-800">
      <CheckCircle weight="duotone" className="text-base" />
      {children}
    </p>
  );
}

function SaveButton({ pending, children }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-end rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-45"
    >
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function ProfileForm({ user }) {
  const [preview, setPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const [state, action, pending] = useActionState(async (prev, formData) => {
    const res = await updateProfile(prev, formData);
    if (res?.ok) {
      // La foto nueva ya viene en `user`: se limpia la vista previa y el input.
      if (fileRef.current) fileRef.current.value = "";
      setPreview(null);
      setRemovePhoto(false);
    }
    return res;
  }, undefined);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function pickPhoto(file) {
    setPhotoError(null);
    if (!file) return setPreview(null);
    if (!file.type.startsWith("image/")) return setPhotoError("El archivo debe ser una imagen.");
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return setPhotoError(`La foto no puede superar ${MAX_PHOTO_MB} MB.`);
    setRemovePhoto(false);
    setPreview(URL.createObjectURL(file));
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    fileRef.current.files = dt.files; // viaja con el formulario
    pickPhoto(file);
  }

  const shown = removePhoto ? { ...user, photo: null } : user;
  const errors = state?.errors ?? {};
  const v = state?.values ?? user;

  return (
    <form action={action} className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          if (!Array.from(e.dataTransfer.types).includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDragging(false)}
        onDrop={onDrop}
        className={`flex items-center gap-3 rounded border border-dashed p-2 ${
          dragging ? "border-accent bg-accent-100" : "border-neutral-300"
        }`}
      >
        <UserAvatar user={shown} src={preview} size={64} />
        <div className="flex flex-col items-start gap-1 text-xs">
          <span className="text-neutral-700">{dragging ? "Suelta la imagen aquí" : "Arrastra una foto aquí o"}</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded border border-neutral-300 bg-neutral-100 px-2 py-1 font-semibold hover:bg-accent-100"
          >
            <Camera weight="duotone" />
            {user.photo || preview ? "Cambiar foto" : "Elegir archivo"}
          </button>
          {user.photo && !preview && (
            <label className="flex items-center gap-1.5 text-neutral-700">
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
        <input
          ref={fileRef}
          type="file"
          name="photo"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0])}
        />
      </div>

      <Field label="Nombre completo" error={errors.name}>
        <input name="name" defaultValue={v.name} required maxLength={80} className={inputClass} />
      </Field>
      <Field label="Correo (con él inicias sesión)" error={errors.email}>
        <input name="email" type="email" defaultValue={v.email} required className={inputClass} />
      </Field>

      <FormError>{state?.error}</FormError>
      <Success>{state?.ok && state.message}</Success>
      <SaveButton pending={pending || Boolean(photoError)}>Guardar datos</SaveButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const formRef = useRef(null);
  const errors = state?.errors ?? {};

  // Vacía los campos tras un cambio exitoso.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      {/* Ayuda a los gestores de contraseñas a asociar la clave con la cuenta. */}
      <input type="text" name="username" autoComplete="username" hidden readOnly />
      <Field label="Contraseña actual" error={errors.current}>
        <PasswordInput name="current" autoComplete="current-password" required />
      </Field>
      <Field label="Nueva contraseña" error={errors.next}>
        <PasswordInput name="next" autoComplete="new-password" placeholder={PASSWORD_HINT} required />
      </Field>
      <Field label="Repite la nueva contraseña" error={errors.confirm}>
        <PasswordInput name="confirm" autoComplete="new-password" required />
      </Field>
      <Success>{state?.ok && state.message}</Success>
      <SaveButton pending={pending}>Cambiar contraseña</SaveButton>
    </form>
  );
}
