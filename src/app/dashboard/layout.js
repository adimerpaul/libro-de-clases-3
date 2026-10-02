import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Sidebar, Topbar } from "./_components/shell";

export default async function DashboardLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { user } = session;

  // Lista liviana para que el menú sepa nombre y curso de la clase activa.
  const subjects = await db.subject.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, course: true },
  });

  return (
    <div className="grid min-h-screen md:grid-cols-[252px_minmax(0,1fr)]">
      <Sidebar subjects={subjects} />
      <div className="flex min-w-0 flex-col">
        <Topbar user={{ name: user.name }} subjects={subjects} />
        <main className="flex flex-1 flex-col gap-5 px-6 pt-5 pb-10 md:px-8">{children}</main>
      </div>
    </div>
  );
}
