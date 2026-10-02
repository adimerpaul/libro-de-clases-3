import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Sidebar, Topbar } from "./_components/shell";

export default async function DashboardLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { user } = session;

  // Lista liviana para que el menú sepa nombre y curso de la clase activa,
  // y cuántas clases tiene sin firmar (contador de «Registro de clases»).
  const rows = await db.subject.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      course: true,
      _count: { select: { lessons: { where: { signedAt: null, deletedAt: null } } } },
    },
  });
  const subjects = rows.map(({ _count, ...s }) => ({ ...s, unsignedLessons: _count.lessons }));

  return (
    <div className="grid min-h-screen md:grid-cols-[208px_minmax(0,1fr)]">
      <Sidebar subjects={subjects} />
      <div className="flex min-w-0 flex-col">
        <Topbar user={{ name: user.name, email: user.email, photo: user.photo }} subjects={subjects} />
        <main className="flex flex-1 flex-col gap-3 p-3">{children}</main>
      </div>
    </div>
  );
}
