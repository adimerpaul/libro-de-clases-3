"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowsLeftRight,
  BookOpenText,
  CalendarDots,
  ChalkboardTeacher,
  CheckSquareOffset,
  Exam,
  List,
  Notebook,
  SignOut,
  SquaresFour,
  Student,
  UserCircleGear,
  UsersThree,
} from "@phosphor-icons/react";
import { logout } from "@/app/actions/auth";
import UserMenu from "./user-menu";

// Clase activa según la URL (/dashboard/clases/:id/...).
function useActiveSubject(subjects) {
  const match = usePathname().match(/^\/dashboard\/clases\/(\d+)/);
  return match ? subjects.find((s) => s.id === Number(match[1])) : null;
}

function NavItem({ href, icon: Icon, label, active, badge }) {
  const base = "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[13px] leading-tight";
  const iconBox = (
    <span className="grid size-5 flex-none place-items-center rounded-sm text-[15px]">
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
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="rounded-full bg-accent2 px-1.5 text-[10px] leading-4 font-semibold text-white">{badge}</span>
      ) : null}
    </Link>
  );
}

function NavGroup({ title, children }) {
  return (
    <div className="flex flex-col gap-px">
      <div className="truncate px-1.5 pb-0.5 text-[10px] tracking-widest text-accent-200 uppercase">{title}</div>
      {children}
    </div>
  );
}

// En escritorio es la columna fija; con `drawer` es el contenido del menú deslizable del celular.
export function Sidebar({ subjects, drawer = false }) {
  const pathname = usePathname();
  const active = useActiveSubject(subjects);
  const base = active ? `/dashboard/clases/${active.id}` : null;

  return (
    <aside
      className={`flex-col gap-3 overflow-auto bg-accent-900 px-2 py-2 text-neutral-100 ${
        drawer ? "flex h-full" : "sticky top-0 hidden h-screen md:flex"
      }`}
    >
      <div className="flex items-center gap-2 rounded bg-accent-800 px-1.5 py-1">
        <span className="grid size-6 flex-none place-items-center rounded bg-accent text-sm">
          <BookOpenText weight="duotone" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold">Libro de Clases 3.0</span>
          <span className="text-[10px] text-accent-200">Año escolar 2026</span>
        </span>
      </div>

      <NavGroup title="General">
        <NavItem href="/dashboard" icon={ChalkboardTeacher} label="Mis clases" active={pathname === "/dashboard"} />
        <NavItem
          href="/dashboard/perfil"
          icon={UserCircleGear}
          label="Mi perfil"
          active={pathname === "/dashboard/perfil"}
        />
      </NavGroup>

      {active && (
        <NavGroup title={`Mi clase · ${active.course}`}>
          <NavItem href={base} icon={SquaresFour} label="Resumen" active={pathname === base} />
          <NavItem
            href={`${base}/estudiantes`}
            icon={Student}
            label="Estudiantes"
            active={pathname === `${base}/estudiantes`}
          />
          <NavItem
            href={`${base}/registro`}
            icon={Notebook}
            label="Registro de clases"
            active={pathname === `${base}/registro`}
            badge={active.unsignedLessons}
          />
          <NavItem
            href={`${base}/asistencia`}
            icon={CheckSquareOffset}
            label="Asistencia"
            active={pathname === `${base}/asistencia`}
          />
          <NavItem
            href={`${base}/calificaciones`}
            icon={Exam}
            label="Calificaciones"
            active={pathname === `${base}/calificaciones`}
          />
          <NavItem
            href={`${base}/actividades`}
            icon={CalendarDots}
            label="Actividades"
            active={pathname === `${base}/actividades`}
          />
          <NavItem
            href={`${base}/familiares`}
            icon={UsersThree}
            label="Antecedentes familiares"
            active={pathname === `${base}/familiares`}
          />
        </NavGroup>
      )}

      <div className="mt-auto flex flex-col gap-1">
        
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-accent-800"
          >
            <SignOut weight="duotone" className="text-[15px]" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}

const SCREEN_TITLES = { estudiantes: "Lista de estudiantes", asistencia: "Toma de asistencia", registro: "Registro de clases", calificaciones: "Calificaciones", actividades: "Calendario de actividades", familiares: "Antecedentes familiares" };

// Botón ☰ (solo celular, a la izquierda) que abre el menú lateral como cajón.
function MobileNav({ subjects }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        title="Menú"
        className="-ml-2 grid size-9 flex-none place-items-center rounded text-2xl text-accent-800 hover:bg-accent-100 md:hidden"
      >
        <List weight="bold" />
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        // Cierra al tocar el fondo o al elegir una opción del menú.
        onClick={(e) => (e.target === ref.current || e.target.closest("a")) && setOpen(false)}
        className="m-0 h-dvh max-h-none w-64 max-w-[80vw] bg-accent-900 p-0 backdrop:bg-ink/40"
      >
        {open && <Sidebar subjects={subjects} drawer />}
      </dialog>
    </>
  );
}

export function Topbar({ user, subjects }) {
  const pathname = usePathname();
  const active = useActiveSubject(subjects);
  const screen = pathname.match(/^\/dashboard\/clases\/\d+\/([^/]+)/)?.[1];
  const title = active
    ? (SCREEN_TITLES[screen] ?? "Resumen de la clase")
    : pathname === "/dashboard/perfil"
      ? "Mi perfil"
      : "Mis clases";
  const label = active ? `${active.name} · ${active.course}` : null;

  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-neutral-100 px-4 py-1.5 shadow-sm">
      <MobileNav subjects={subjects} />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[11px] text-neutral-700">{label ?? "Inicio"}</span>
        <span className="text-[15px] font-semibold whitespace-nowrap">
          {title}
        </span>
      </div>
      <div className="flex-1" />
      {active && (
        <Link
          href="/dashboard"
          title="Cambiar de clase"
          className="hidden items-center gap-1.5 rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-accent-100 lg:flex"
        >
          <ChalkboardTeacher weight="duotone" className="text-sm text-accent" />
          {label}
          <ArrowsLeftRight weight="duotone" className="text-neutral-700" />
        </Link>
      )}
      <UserMenu user={user} />
    </header>
  );
}
