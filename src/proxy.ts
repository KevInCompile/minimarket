import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { authConfig } from "@/auth.config";

/**
 * Proxy edge-safe: usa authConfig (sin Prisma, sin bcrypt).
 *
 * Decodifica el JWT manualmente con `decode` de next-auth/jwt porque el
 * wrapper `auth()` de NextAuth v5 no aplica correctamente el session
 * callback en middleware — los custom fields (id, role) no aparecen
 * en `req.auth.user`. El JWT sí los tiene.
 */
const ADMIN_ONLY_PREFIXES = [
  "/retiros",
  "/pedidos",
  "/proveedores",
  "/usuarios",
];

const PUBLIC_PATHS = ["/login", "/forbidden"];

const { handlers } = NextAuth(authConfig);

async function getRoleFromJWT(req: Request): Promise<{
  role: "ADMIN" | "CAJERO";
  userId: string;
} | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";

  // En HTTPS (producción), NextAuth usa `__Secure-authjs.session-token`.
  // En HTTP (dev), usa `authjs.session-token`. Aceptamos ambas.
  const match = cookieHeader.match(/((?:__Secure-)?authjs\.session-token)=([^;]+)/);
  const cookieName = match?.[1];
  const token = match?.[2];
  if (!token || !cookieName) return null;

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    console.error("[proxy] AUTH_SECRET no definido");
    return null;
  }

  try {
    // El salt para descifrar es el nombre completo del cookie.
    // (__Secure-authjs.session-token en prod, authjs.session-token en dev)
    const decoded = await decode({
      token,
      secret,
      salt: cookieName,
    });
    if (!decoded?.role) return null;
    return {
      role: decoded.role as "ADMIN" | "CAJERO",
      userId: (decoded.uid as string) ?? "",
    };
  } catch (e) {
    console.error("[proxy] error decodificando JWT:", e);
    return null;
  }
}

export default async function proxy(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Endpoints de API de auth (signin, callback, csrf, session) — pasan
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const auth = await getRoleFromJWT(request);

  if (!auth) {
    const loginUrl = new URL("/login", url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    auth.role !== "ADMIN" &&
    ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.redirect(new URL("/forbidden", url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// handlers exportado para cumplir el tipo del módulo NextAuth route
void handlers;