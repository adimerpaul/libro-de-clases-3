import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { readPhoto } from "@/lib/photos";

// Sirve la foto WebP de un estudiante solo al docente dueño de la clase.
export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return new Response("No autorizado", { status: 401 });

  const { id } = await params;
  const student = await db.student.findFirst({
    where: { id: Number(id) || -1, subject: { userId: session.user.id, deletedAt: null } },
    select: { photo: true },
  });
  if (!student?.photo) return new Response("No encontrado", { status: 404 });

  const body = await readPhoto(student.photo);
  if (!body) return new Response("No encontrado", { status: 404 });
  return new Response(body, {
    headers: {
      "Content-Type": "image/webp",
      // La URL lleva ?v=<archivo>, así que puede cachearse; "private" evita CDNs/proxies.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
