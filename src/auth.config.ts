/**
 * Config compartida de NextAuth — edge-safe (sin Prisma, sin bcrypt).
 *
 * La autorización de rutas se hace en `src/proxy.ts` (que usa este config)
 * para poder distinguir "no autenticado" vs "no autorizado" y redirigir
 * a /login o /forbidden respectivamente.
 */

import type { NextAuthConfig } from "next-auth";

/**
 * Config mínima de NextAuth — edge-safe.
 *
 * El proxy en `src/proxy.ts` decodifica el JWT manualmente con `decode`
 * de `next-auth/jwt` en lugar de usar el wrapper `auth()`. Esto evita
 * un bug conocido de NextAuth v5 donde los custom fields del session
 * callback (id, role) no aparecen en `req.auth.user` en middleware.
 */

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {},
};