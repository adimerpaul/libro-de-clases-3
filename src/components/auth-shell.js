import { BookOpenText } from "@phosphor-icons/react/ssr";

// Layout compartido por /login y /registro (panel de marca + columna del formulario).
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[minmax(0,1.1fr)_minmax(360px,1fr)]">
      <div className="hidden flex-col gap-8 bg-accent-900 px-14 py-10 text-neutral-100 md:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded bg-accent text-2xl">
            <BookOpenText weight="duotone" />
          </span>
          <span className="text-xl font-semibold">Libro de Clases 3.0</span>
        </div>
        <div className="mt-auto flex max-w-lg flex-col gap-4">
          <h1 className="text-5xl leading-tight font-semibold">
            El libro de clases de tu colegio, en un solo lugar.
          </h1>
          <p className="text-lg text-pretty text-accent-200">
            Registro de clases, asistencia, calificaciones y antecedentes de cada estudiante.
          </p>
        </div>
      </div>

      <div className="grid place-items-center p-10">
        <div className="flex w-full max-w-sm flex-col gap-5">
          <div>
            <h2 className="text-3xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-neutral-700">{subtitle}</p>
          </div>
          {children}
          <p className="text-center text-xs text-neutral-700">Año escolar 2026</p>
        </div>
      </div>
    </div>
  );
}
