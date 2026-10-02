/**
 * Config compartida de NextAuth — edge-safe (sin Prisma, sin bcrypt).
 *
 * Usado por el proxy (middleware) que corre en edge runtime.
 * Los providers que necesitan Prisma se agregan en `auth.ts`.
 */

import type { NextAuthConfig } from "next-auth";

const ADMIN_ONLY_PREFIXES = [
  "/retiros",
  "/pedidos",
  "/proveedores",
  "/usuarios",
];

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      const isLogin = pathname.startsWith("/login");

      if (isLogin) return true;

      if (!session?.user) {
        return false;
      }

      if (session.user.role !== "ADMIN") {
        if (ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
          return false;
        }
      }
      return true;
    },
  },
};