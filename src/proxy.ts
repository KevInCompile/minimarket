import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Proxy edge-safe: solo usa authConfig (sin Prisma, sin bcrypt).
 * Si la sesión apunta a un user que ya no existe, requireValidUser
 * en server actions redirige al login.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};