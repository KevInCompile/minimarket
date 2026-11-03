"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { fromISODate } from "@/lib/dates";
import { requireValidUser, requireTiendaId } from "@/lib/auth-guard";
import { okState, errState, type ActionState } from "./_state";

export type TransferenciaState = ActionState;

export async function guardarTransferenciaAction(
  _prev: TransferenciaState,
  formData: FormData,
): Promise<TransferenciaState> {
  const [user, tiendaId] = await Promise.all([
    requireValidUser(),
    requireTiendaId(),
  ]);

  const fechaStr = formData.get("fecha")?.toString() ?? "";
  const totalStr = formData.get("total")?.toString() ?? "0";

  if (!fechaStr) return errState("Fecha requerida.");
  const total = Number(totalStr.replace(/[^0-9]/g, "")) || 0;
  if (total < 0) return errState("Total no puede ser negativo.");

  const fecha = fromISODate(fechaStr);

  // El upsert empareja por (fecha, tiendaId), NO solo por fecha: el unique
  // es compuesto. Con un unique global, el `update` de una tienda se
  // aplicaba sobre la fila de otra y le cambiaba el `tiendaId` (la tienda B
  // se apropiaba del renglón de la tienda A).
  await prisma.transferenciaDia.upsert({
    where: { fecha_tiendaId: { fecha, tiendaId } },
    update: { total, userId: user.id },
    create: { fecha, total, userId: user.id, tiendaId },
  });

  revalidatePath("/transferencia");
  revalidatePath("/");
  revalidatePath("/cierre");
  return okState();
}
