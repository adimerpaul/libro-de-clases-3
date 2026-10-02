"use client";

import { useActionState } from "react";
import { register } from "@/app/actions/auth";
import { FieldError, PasswordInput, SubmitButton, inputClass } from "@/components/form-fields";

export default function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Nombre completo
        <input
          name="name"
          autoComplete="name"
          placeholder="Robin González"
          defaultValue={state?.name}
          required
          className={inputClass}
        />
        <FieldError>{errors.name}</FieldError>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Correo
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="usuario@colegio.cl"
          defaultValue={state?.email}
          required
          className={inputClass}
        />
        <FieldError>{errors.email}</FieldError>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Contraseña
        <PasswordInput name="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" required />
        <FieldError>{errors.password}</FieldError>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Repite la contraseña
        <PasswordInput name="confirm" autoComplete="new-password" placeholder="••••••••" required />
        <FieldError>{errors.confirm}</FieldError>
      </label>

      <SubmitButton pending={pending} pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
