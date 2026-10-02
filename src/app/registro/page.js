import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AuthShell from "@/components/auth-shell";
import RegisterForm from "./register-form";

export const metadata = { title: "Crear cuenta · Libro de Clases 3.0" };

export default async function RegisterPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Te crearemos una clase de Matemática de ejemplo, con estudiantes, asistencia, notas, actividades y fichas familiares, para que veas cómo funciona todo."
    >
      <RegisterForm />
      <p className="text-center text-sm text-neutral-700">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-accent-700 hover:text-accent-600">
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}
