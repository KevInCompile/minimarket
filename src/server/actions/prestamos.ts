"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, requireTiendaId } from "@/lib/auth-guard";
import { validaPrestamo } from "@/lib/prestamos";
import { startOfDayUTC } from "@/lib/dates";
import { okState, errState, type ActionState } from "./_state";

export type PrestamoState = ActionState;

/**
 * Registra un préstamo nuevo.
 *
 * El módulo es solo ADMIN (la ruta está en `ADMIN_ONLY_PREFIXES` del
 * proxy) y las acciones lo vuelven a exigir: el proxy protege la URL, la
 * acción protege el write.
 *
 * El `tiendaId` que se escribe es SIEMPRE el de la sesión: nunca se confía
 * en un id que venga del cliente.
 */
export async function crearPrestamoAction(
  _prev: PrestamoState,
  formData: FormData,
): Promise<PrestamoState> {
  const user = await requireAdmin();
  const tiendaId = await requireTiendaId();

  const parsed = validaPrestamo(
    {
      fecha: formData.get("fecha")?.toString() ?? "",
      persona: formData.get("persona")?.toString() ?? "",
      valor: formData.get("valor")?.toString() ?? "",
      nota: formData.get("nota")?.toString() ?? "",
    },
    new Date(),
  );
  if (!parsed.ok) return errState(parsed.error, parsed.campo);

  await prisma.prestamo.create({
    data: {
      fecha: parsed.data.fecha,
      persona: parsed.data.persona,
      valor: parsed.data.valor,
      nota: parsed.data.nota,
      userId: user.id,
      tiendaId,
    },
  });

  revalidatePath("/prestamos");
  return okState();
}

/**
 * Marca el préstamo como pagado o lo vuelve a pendiente.
 *
 * Un préstamo pagado guarda la fecha de pago; al volverlo a pendiente esa
 * fecha se borra.
 */
export async function alternarPagoPrestamoAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const tiendaId = await requireTiendaId();

  const id = formData.get("id")?.toString();
  if (!id) return;

  const prestamo = await prisma.prestamo.findUnique({ where: { id } });
  if (!prestamo) return;
  // Un id de otra tienda no existe para esta sesión: no se toca.
  if (prestamo.tiendaId !== tiendaId) return;

  await prisma.prestamo.update({
    where: { id },
    data: prestamo.pagado
      ? { pagado: false, fechaPago: null }
      : { pagado: true, fechaPago: startOfDayUTC(new Date()) },
  });

  revalidatePath("/prestamos");
}

/** Borra un préstamo de la tienda de la sesión. */
export async function eliminarPrestamoAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const tiendaId = await requireTiendaId();

  const id = formData.get("id")?.toString();
  if (!id) return;

  const prestamo = await prisma.prestamo.findUnique({ where: { id } });
  if (!prestamo) return;
  if (prestamo.tiendaId !== tiendaId) return;

  await prisma.prestamo.delete({ where: { id } });

  revalidatePath("/prestamos");
}
