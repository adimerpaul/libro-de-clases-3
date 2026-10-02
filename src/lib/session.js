import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 7;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

// Crea un token en la tabla `tokens` y lo guarda en una cookie httpOnly.
export async function createSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const h = await headers();

  await db.token.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ip: h.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
      userAgent: h.get("user-agent"),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// Devuelve { token, user } si la cookie corresponde a un token vigente, o null.
export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const record = await db.token.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, email: true, role: true, deletedAt: true } } },
  });
  if (!record || record.expiresAt <= new Date() || record.user.deletedAt) return null;

  return { tokenId: record.id, user: record.user };
});

// Soft delete del token actual y borrado de la cookie.
export async function deleteSession() {
  const session = await getSession();
  if (session) await db.token.delete({ where: { id: session.tokenId } });
  (await cookies()).delete(SESSION_COOKIE);
}
