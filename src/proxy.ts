import { NextResponse } from "next/server";
import { auth } from "@/auth";

const ADMIN_ONLY_PREFIXES = [
  "/retiros",
  "/pedidos",
  "/proveedores",
  "/usuarios",
  "/importar",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLogin = pathname.startsWith("/login");

  // Permitir assets y la API de auth siempre
  if (isLogin) return NextResponse.next();

  const session = req.auth;
  if (!session?.user) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Cajero no puede acceder a rutas solo-admin
  if (session.user.role !== "ADMIN") {
    if (ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
      const url = new URL("/forbidden", req.nextUrl);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
