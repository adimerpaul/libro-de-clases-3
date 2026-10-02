"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CaretDown, SignOut, UserCircleGear } from "@phosphor-icons/react";
import { logout } from "@/app/actions/auth";

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function UserAvatar({ user, src, size = 24 }) {
  const style = { width: size, height: size };
  const url = src ?? (user.photo ? `/api/fotos/usuarios?v=${encodeURIComponent(user.photo)}` : null);
  if (url) {
    // next/image no sirve aquí: su optimizador pide la imagen sin la cookie de sesión.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} className="flex-none rounded-full object-cover" />;
  }
  return (
    <span
      style={{ ...style, fontSize: size * 0.4 }}
      className="grid flex-none place-items-center rounded-full bg-accent font-semibold text-neutral-100"
    >
      {initials(user.name)}
    </span>
  );
}

// Chip del usuario en la barra superior: menú con «Mi perfil» (página /dashboard/perfil) y «Cerrar sesión».
export default function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-accent-100";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full bg-neutral-200 py-0.5 pr-2 pl-0.5 hover:bg-accent-100"
      >
        <UserAvatar user={user} />
        <span className="hidden max-w-40 truncate text-xs sm:inline">{user.name}</span>
        <CaretDown weight="bold" className="text-[10px] text-neutral-700" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-60 rounded-lg bg-neutral-100 p-1 shadow-lg ring-1 ring-neutral-300">
          <div className="flex items-center gap-2 border-b border-neutral-200 px-2 pt-1 pb-2">
            <UserAvatar user={user} size={36} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-neutral-700">{user.email}</div>
            </div>
          </div>
          <Link href="/dashboard/perfil" role="menuitem" onClick={() => setOpen(false)} className={`${item} mt-1`}>
            <UserCircleGear weight="duotone" className="text-base text-accent" />
            Mi perfil
          </Link>
          <form action={logout}>
            <button type="submit" role="menuitem" className={`${item} text-accent2-700 hover:bg-accent2-100`}>
              <SignOut weight="duotone" className="text-base" />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
