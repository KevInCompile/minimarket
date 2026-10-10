import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Devuelve el user validado contra la DB, o redirige al login si la sesión
 * está stale (típicamente porque la DB se reseteó y los user IDs cambiaron).
 *
 * Usar en TODOS los server actions que mutan datos con `userId` como FK.
 */
export async function requireValidUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      nombre: true,
      email: true,
      activo: true,
      tiendaId: true,
    },
  });
  if (!user) {
    // Sesión apunta a un user que ya no existe (ej: DB reseteada).
    // Forzar re-login.
    redirect("/login?expired=1");
  }
  if (!user.activo) redirect("/login?inactive=1");
  return user;
}

export async function requireAdmin() {
  const user = await requireValidUser();
  if (user.role !== "ADMIN") {
    throw new Error("Solo el admin puede realizar esta acción.");
  }
  return user;
}

/**
 * Helper para obtener el tiendaId del user actual (de la sesión).
 * Cacheado por request.
 *
 * Si el user no tiene sesión o su tiendaId no está en la sesión, retorna null.
 */
import { cache } from "react";

export const getTiendaId = cache(async (): Promise<string | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  // Priorizar el tiendaId de la sesión (más rápido), pero verificar contra la DB
  if (session.user.tiendaId) {
    return session.user.tiendaId;
  }
  // Fallback: buscar en DB
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tiendaId: true },
  });
  return user?.tiendaId ?? null;
});

/**
 * Requiere que haya un tiendaId en la sesión. Redirige a /login si no.
 * Usar en server actions y pages que necesitan saber la tienda.
 */
export async function requireTiendaId(): Promise<string> {
  const tiendaId = await getTiendaId();
  if (!tiendaId) redirect("/login");
  return tiendaId;
}
