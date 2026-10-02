"use client";

import { useEffect, useRef } from "react";

// <dialog> nativo controlado por `open`. El contenido solo se monta mientras está
// abierto, así cada apertura empieza con estado limpio (formularios, errores).
export default function Modal({ open, onClose, title, children, className = "max-w-md" }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-full rounded-lg bg-neutral-100 p-0 text-ink shadow-xl backdrop:bg-ink/40 ${className}`}
    >
      {open && (
        <div className="flex flex-col gap-3 p-4">
          <h3 className="text-base font-semibold">{title}</h3>
          {children}
        </div>
      )}
    </dialog>
  );
}
