import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AuthShell from "@/components/auth-shell";
import LoginForm from "./login-form";

export const metadata = { title: "Iniciar sesión · Libro de Clases 3.0" };

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <AuthShell title="Iniciar sesión" subtitle="Ingresa con tu correo y contraseña.">
      <LoginForm />
      <p className="text-center text-sm text-neutral-700">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-accent-700 hover:text-accent-600">
          Regístrate
        </Link>
      </p>
    </AuthShell>
  );
}
