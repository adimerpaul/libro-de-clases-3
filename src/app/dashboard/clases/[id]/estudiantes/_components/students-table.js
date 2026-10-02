"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Camera,
  CircleNotch,
  DotsThreeVertical,
  ImageSquare,
  PencilSimple,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import { setStudentPhoto } from "@/app/actions/students";
import StudentAvatar from "./student-avatar";
import { StudentModals, checkPhotoFile, isFileDrag } from "./student-actions";

const dateFmt = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

function MenuItem({ icon: Icon, children, danger, ...props }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[13px] ${
        danger ? "text-accent2-700 hover:bg-accent2-100" : "hover:bg-accent-100"
      }`}
      {...props}
    >
      <Icon weight="duotone" className="text-[15px]" />
      {children}
    </button>
  );
}

// Menú ⋮ como popover nativo: vive en la capa superior, así el overflow de la tabla no lo recorta.
function RowMenu({ student, onEdit, onDelete, onPickPhoto, onRemovePhoto }) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  function toggle() {
    const r = buttonRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 2, left: r.left });
    menuRef.current.togglePopover();
  }
  const run = (fn) => () => {
    menuRef.current.hidePopover();
    fn();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        title="Opciones"
        aria-label={`Opciones de ${student.firstName} ${student.lastName}`}
        aria-haspopup="menu"
        className="grid size-6 place-items-center rounded text-base text-neutral-700 hover:bg-accent-100 hover:text-accent-700"
      >
        <DotsThreeVertical weight="bold" />
      </button>
      <div
        ref={menuRef}
        popover="auto"
        role="menu"
        style={{ position: "fixed", inset: "auto", top: pos.top, left: pos.left, margin: 0 }}
        className="w-44 rounded-lg border border-neutral-300 bg-neutral-100 p-1 text-ink shadow-lg"
      >
        <MenuItem icon={PencilSimple} onClick={run(onEdit)}>
          Editar datos
        </MenuItem>
        <MenuItem icon={Camera} onClick={run(onPickPhoto)}>
          {student.photo ? "Cambiar foto" : "Subir foto"}
        </MenuItem>
        {student.photo && (
          <MenuItem icon={XCircle} onClick={run(onRemovePhoto)}>
            Quitar foto
          </MenuItem>
        )}
        <div className="my-1 border-t border-neutral-300" />
        <MenuItem icon={Trash} danger onClick={run(onDelete)}>
          Eliminar
        </MenuItem>
      </div>
    </>
  );
}

function StudentRow({ subjectId, student }) {
  const [mode, setMode] = useState(null); // "edit" | "delete" | null
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef(null);
  const dragDepth = useRef(0); // dragenter/leave se disparan por cada celda hija

  function upload(file, remove = false) {
    setError(null);
    if (!remove) {
      const problem = checkPhotoFile(file);
      if (problem) return setError(problem);
    }
    const fd = new FormData();
    fd.set("id", student.id);
    if (remove) fd.set("remove", "on");
    else fd.set("photo", file);
    startTransition(async () => {
      const res = await setStudentPhoto(fd);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <tr
      onDragEnter={(e) => {
        if (!isFileDrag(e)) return;
        dragDepth.current++;
        setDragging(true);
      }}
      onDragOver={(e) => isFileDrag(e) && e.preventDefault()}
      onDragLeave={() => {
        if (--dragDepth.current <= 0) {
          dragDepth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) upload(file);
      }}
      className={`border-b border-neutral-200 ${
        dragging ? "bg-accent-200 outline-2 -outline-offset-2 outline-accent outline-dashed" : "hover:bg-accent-100/50"
      }`}
    >
      <td className="w-7 py-0.5 pl-1">
        <RowMenu
          student={student}
          onEdit={() => setMode("edit")}
          onDelete={() => setMode("delete")}
          onPickPhoto={() => fileRef.current.click()}
          onRemovePhoto={() => upload(null, true)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload(file);
          }}
        />
        <StudentModals subjectId={subjectId} student={student} mode={mode} onClose={() => setMode(null)} />
      </td>
      <td className="px-2 py-0.5 text-neutral-700">{student.listNumber}</td>
      <td className="px-2 py-0.5">
        <div className="flex items-center gap-2">
          <span className="relative">
            <StudentAvatar student={student} />
            {pending && (
              <span className="absolute inset-0 grid place-items-center rounded-full bg-neutral-100/80 text-accent">
                <CircleNotch weight="bold" className="animate-spin" />
              </span>
            )}
          </span>
          <span className="truncate">
            {student.lastName} {student.secondLastName}, {student.firstName}
          </span>
          {dragging && (
            <span className="flex items-center gap-1 text-xs text-accent-800">
              <ImageSquare weight="duotone" /> Suelta para cambiar la foto
            </span>
          )}
          {error && <span className="text-xs text-accent2-700">{error}</span>}
        </div>
      </td>
      <td className="px-2 py-0.5 whitespace-nowrap">{student.rut ?? "—"}</td>
      <td className="px-2 py-0.5 whitespace-nowrap">
        {student.birthDate ? dateFmt.format(student.birthDate).replaceAll("-", "/") : "—"}
      </td>
    </tr>
  );
}

export default function StudentsTable({ subjectId, students }) {
  // Si la imagen se suelta fuera de una fila, que el navegador no la abra como página.
  useEffect(() => {
    const block = (e) => isFileDrag(e) && e.preventDefault();
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  return (
    <div className="overflow-auto">
      <table className="w-full text-left text-[13px] leading-tight">
        <thead className="sticky top-0 z-[1] bg-neutral-200 text-xs text-neutral-700">
          <tr>
            <th className="w-7" />
            <th className="w-8 px-2 py-1.5 font-semibold">N°</th>
            <th className="px-2 py-1.5 font-semibold">Estudiante</th>
            <th className="px-2 py-1.5 font-semibold">RUN</th>
            <th className="px-2 py-1.5 font-semibold">Nacimiento</th>
          </tr>
        </thead>
        <tbody>
          {students.map((st) => (
            <StudentRow key={st.id} subjectId={subjectId} student={st} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
