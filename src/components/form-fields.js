"use client";

import { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

export const inputClass =
  "w-full rounded border border-neutral-300 bg-neutral-100 px-3 py-2.5 outline-none focus:border-accent";

export function FieldError({ children }) {
  if (!children) return null;
  return <span className="text-sm font-normal text-accent2-700">{children}</span>;
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded bg-accent2-100 px-3 py-2 text-sm text-accent2-700">
      {children}
    </p>
  );
}

// Input de contraseña con botón de ojo para mostrar/ocultar.
export function PasswordInput(props) {
  const [show, setShow] = useState(false);
  const label = show ? "Ocultar contraseña" : "Mostrar contraseña";

  return (
    <span className="relative">
      <input {...props} type={show ? "text" : "password"} className={`${inputClass} pr-11`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={label}
        aria-pressed={show}
        title={label}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded text-xl text-neutral-700 hover:text-accent-700"
      >
        {show ? <EyeSlash weight="duotone" /> : <Eye weight="duotone" />}
      </button>
    </span>
  );
}

export function SubmitButton({ pending, children, pendingText }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-accent px-4 py-3 font-semibold text-white hover:bg-accent-600 active:bg-accent-700 disabled:opacity-45"
    >
      {pending ? pendingText : children}
    </button>
  );
}
