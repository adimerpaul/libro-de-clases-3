import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { PasswordForm, ProfileForm } from "./_components/profile-forms";

export const metadata = { title: "Mi perfil · Libro de Clases 3.0" };

const dateFmt = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" });
const dateTimeFmt = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Santiago",
});

function Section({ title, subtitle, children }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg bg-neutral-100 p-4 shadow-sm">
      <div className="leading-tight">
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-neutral-700">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function ProfilePage() {
  const { user, tokenId } = await getSession();

  const [account, subjectCount, sessions] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { createdAt: true } }),
    db.subject.count({ where: { userId: user.id } }),
    db.token.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="grid max-w-5xl gap-3 lg:grid-cols-2 lg:items-start">
      <Section title="Datos personales" subtitle="Tu nombre, correo y foto se muestran en la barra superior.">
        <ProfileForm user={{ name: user.name, email: user.email, photo: user.photo }} />
      </Section>

      <div className="flex flex-col gap-3">
        <Section
          title="Cambiar contraseña"
          subtitle="Por seguridad te pedimos tu contraseña actual. Al cambiarla se cierran tus sesiones en otros dispositivos."
        >
          <PasswordForm />
        </Section>

        <Section title="Cuenta">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
            <dt className="text-neutral-700">Rol</dt>
            <dd className="capitalize">{user.role}</dd>
            <dt className="text-neutral-700">Miembro desde</dt>
            <dd>{dateFmt.format(account.createdAt)}</dd>
            <dt className="text-neutral-700">Clases</dt>
            <dd>{subjectCount}</dd>
          </dl>
          <div className="text-[11px] tracking-widest text-neutral-700 uppercase">Sesiones abiertas</div>
          <ul className="flex flex-col text-[13px]">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-2 border-b border-neutral-200 py-1">
                <span className="whitespace-nowrap">{dateTimeFmt.format(s.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">{s.userAgent ?? "—"}</span>
                {s.id === tokenId && (
                  <span className="rounded bg-accent-100 px-1.5 py-0.5 text-xs text-accent-800">esta sesión</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
