"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowsLeftRight,
  BookOpenText,
  CalendarDots,
  ChalkboardTeacher,
  CheckSquareOffset,
  Exam,
  Notebook,
  SignOut,
  SquaresFour,
  Student,
  UsersThree,
} from "@phosphor-icons/react";
import { logout } from "@/app/actions/auth";

// Clase activa según la URL (/dashboard/clases/:id/...).
function useActiveSubject(subjects) {
  const match = usePathname().match(/^\/dashboard\/clases\/(\d+)/);
  return match ? subjects.find((s) => s.id === Number(match[1])) : null;
}

function NavItem({ href, icon: Icon, label, active }) {
  const base = "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm";
  const iconBox = (
    <span className="grid size-[26px] flex-none place-items-center rounded-sm bg-accent-800 text-base">
      <Icon weight="duotone" />
    </span>
  );
  if (!href) {
    return (
      <span title="Próximamente" className={`${base} cursor-not-allowed opacity-45`}>
        {iconBox}
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className={`${base} ${active ? "bg-accent" : "hover:bg-accent-700"}`}>
      {iconBox}
      {label}
    </Link>
  );
}

function NavGroup({ title, children }) {
  return (
    <div className="flex flex-col gap-[3px]">
      <div className="px-2 pb-1 text-[10px] tracking-widest text-accent-200 uppercase">{title}</div>
      {children}
    </div>
  );
}

export function Sidebar({ subjects }) {
  const pathname = usePathname();
  const active = useActiveSubject(subjects);
  const base = active ? `/dashboard/clases/${active.id}` : null;

  return (
    <aside className="sticky top-0 hidden h-screen flex-col gap-5 overflow-auto bg-accent-900 px-4 py-5 text-neutral-100 md:flex">
      <div className="flex items-center gap-2 rounded-lg bg-accent-800 p-2">
        <span className="grid size-9 flex-none place-items-center rounded-lg bg-accent text-xl">
          <BookOpenText weight="duotone" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-semibold">Libro de Clases 3.0</span>
          <span className="text-[11px] text-accent-200">Año escolar 2026</span>
        </span>
      </div>

      <NavGroup title="General">
        <NavItem href="/dashboard" icon={ChalkboardTeacher} label="Mis clases" active={pathname === "/dashboard"} />
      </NavGroup>

      {active && (
        <NavGroup title={`Mi clase · ${active.course}`}>
          <NavItem icon={SquaresFour} label="Resumen" />
          <NavItem href={base} icon={Student} label="Estudiantes" active={pathname === base} />
          <NavItem icon={Notebook} label="Registro de clases" />
          <NavItem icon={CheckSquareOffset} label="Asistencia" />
          <NavItem icon={Exam} label="Calificaciones" />
          <NavItem icon={CalendarDots} label="Actividades" />
          <NavItem icon={UsersThree} label="Antecedentes familiares" />
        </NavGroup>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <div className="px-2 text-[11px] text-accent-200">Libro de Clases 3.0 · 2026</div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg border border-accent-700 px-2 py-2.5 text-sm hover:bg-accent-800"
          >
            <SignOut weight="duotone" className="text-lg" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function Topbar({ user, subjects }) {
  const active = useActiveSubject(subjects);
  const label = active ? `${active.name} · ${active.course}` : null;

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 bg-neutral-100 px-6 py-3 shadow-sm md:px-8">
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-xs text-neutral-700">{label ?? "Inicio"}</span>
        <span className="text-lg font-semibold whitespace-nowrap">
          {active ? "Lista de estudiantes" : "Mis clases"}
        </span>
      </div>
      <div className="flex-1" />
      {active && (
        <Link
          href="/dashboard"
          title="Cambiar de clase"
          className="hidden items-center gap-2 rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-accent-100 lg:flex"
        >
          <ChalkboardTeacher weight="duotone" className="text-lg text-accent" />
          {label}
          <ArrowsLeftRight weight="duotone" className="text-neutral-700" />
        </Link>
      )}
      <div className="flex items-center gap-2 rounded-full bg-neutral-200 py-1 pr-3 pl-1">
        <span className="grid size-[30px] place-items-center rounded-full bg-accent text-xs font-semibold text-neutral-100">
          {initials(user.name)}
        </span>
        <span className="hidden text-sm whitespace-nowrap sm:inline">{user.name}</span>
      </div>
      <form action={logout} className="md:hidden">
        <button type="submit" title="Cerrar sesión" className="text-xl">
          <SignOut weight="duotone" />
        </button>
      </form>
    </header>
  );
}
