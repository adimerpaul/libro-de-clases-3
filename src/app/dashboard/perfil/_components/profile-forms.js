"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle } from "@phosphor-icons/react";
import { changePassword, updateProfile } from "@/app/actions/profile";
import { FieldError, FormError, PasswordInput, inputClass } from "@/components/form-fields";
import { PASSWORD_HINT } from "@/lib/password";
import { UserAvatar } from "../../_components/user-menu";
import { useWebpPhoto } from "@/components/use-webp-photo";
import { MAX_SOURCE_MB } from "@/lib/webp-client";

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
  const [removePhoto, setRemovePhoto] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pickerRef = useRef(null);
  const { photoRef, preview, error: photoError, converting, pick: pickWebp, reset: resetPhoto } = useWebpPhoto();
  const [state, action, pending] = useActionState(async (prev, formData) => {
    const res = await updateProfile(prev, formData);
    if (res?.ok) {
      // La foto nueva ya viene en `user`: se limpia la vista previa y el input.
      resetPhoto();
      setRemovePhoto(false);
    }
    return res;
  }, undefined);

  function pickPhoto(file) {
    setRemovePhoto(false);
    pickWebp(file); // convierte a WebP y lo deja en el input oculto "photo"
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    pickPhoto(e.dataTransfer.files?.[0]);
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
            onClick={() => pickerRef.current?.click()}
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
          {converting && <span className="text-accent-700">Convirtiendo a WebP…</span>}
          <span className="text-neutral-500">JPG, PNG o WebP hasta {MAX_SOURCE_MB} MB · se guarda como WebP 400×400</span>
          <FieldError>{photoError ?? errors.photo}</FieldError>
        </div>
        {/* Sin name: la imagen original no se envía, solo el WebP del input oculto. */}
        <input
          ref={pickerRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pickPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input ref={photoRef} type="file" name="photo" hidden />
      </div>

      <Field label="Nombre completo" error={errors.name}>
        <input name="name" defaultValue={v.name} required maxLength={80} className={inputClass} />
      </Field>
      <Field label="Correo (con él inicias sesión)" error={errors.email}>
        <input name="email" type="email" defaultValue={v.email} required className={inputClass} />
      </Field>

      <FormError>{state?.error}</FormError>
      <Success>{state?.ok && state.message}</Success>
      <SaveButton pending={pending || converting}>Guardar datos</SaveButton>
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
