import { getSession } from "@/lib/session";
import { readPhoto } from "@/lib/photos";

// Sirve la foto WebP del usuario de la sesión.
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("No autorizado", { status: 401 });
  if (!session.user.photo) return new Response("No encontrado", { status: 404 });

  try {
    const body = await readPhoto(session.user.photo, "usuarios");
    return new Response(body, {
      headers: {
        "Content-Type": "image/webp",
        // La URL lleva ?v=<archivo>, así que puede cachearse; "private" evita CDNs/proxies.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
