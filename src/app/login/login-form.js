"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { FormError, PasswordInput, SubmitButton, inputClass } from "@/components/form-fields";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Correo
        <input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="usuario@colegio.cl"
          defaultValue={state?.email}
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Contraseña
        <PasswordInput name="password" autoComplete="current-password" placeholder="••••••••" required />
      </label>

      <FormError>{state?.error}</FormError>

      <SubmitButton pending={pending} pendingText="Ingresando…">
        Ingresar
      </SubmitButton>
    </form>
  );
}
