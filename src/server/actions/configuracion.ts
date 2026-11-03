"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTiendaId, requireAdmin } from "@/lib/auth-guard";
import { okState, errState, type ActionState } from "./_state";

export type ConfiguracionState = ActionState;

/**
 * Guarda el día de corte del período contable de la tienda.
 *
 * El día de corte es el día del mes en que se reinician los datos que se
 * ven en el balance. Con 1 el período es el mes calendario; con 15 va del
 * 15 de un mes al 14 del siguiente.
 */
export async function guardarDiaCorteAction(
  _prev: ConfiguracionState,
  formData: FormData,
): Promise<ConfiguracionState> {
  await requireAdmin();
  const tiendaId = await requireTiendaId();

  const raw = formData.get("diaCorte")?.toString() ?? "";
  const diaCorte = Number(raw);

  if (!Number.isInteger(diaCorte) || diaCorte < 1 || diaCorte > 28) {
    return errState("El día de corte debe ser un número entre 1 y 28.");
  }

  await prisma.tienda.update({
    where: { id: tiendaId },
    data: { diaCorte },
  });

  // El balance, el cierre y las listas dependen del corte: hay que
  // revalidarlos todos.
  revalidatePath("/configuracion");
  revalidatePath("/");
  revalidatePath("/cierre");
  revalidatePath("/gastos");
  revalidatePath("/retiros");
  revalidatePath("/transferencia");

  return okState();
}
