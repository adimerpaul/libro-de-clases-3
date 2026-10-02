import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-10">
      <div className="flex max-w-sm flex-col items-start gap-3">
        <span className="text-sm text-neutral-700">Error 404</span>
        <h1 className="text-3xl font-semibold">No encontramos esta página</h1>
        <p className="text-neutral-700">Puede que la clase no exista o que no tengas acceso a ella.</p>
        <Link href="/dashboard" className="rounded bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-600">
          Volver a mis clases
        </Link>
      </div>
    </div>
  );
}
