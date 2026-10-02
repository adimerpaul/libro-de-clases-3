import { NextResponse } from "next/server";

// Chequeo optimista: solo mira si existe la cookie. La validación real del
// token contra la tabla `tokens` la hace getSession() en el layout del dashboard.
export function proxy(request) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
