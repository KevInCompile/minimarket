"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { fromISODate } from "@/lib/dates";
import { requireValidUser } from "@/lib/auth-guard";
import { okState, errState, type ActionState } from "./_state";

export type NequiState = ActionState;

export async function guardarNequiAction(
  _prev: NequiState,
  formData: FormData,
): Promise<NequiState> {
  const user = await requireValidUser();

  const fechaStr = formData.get("fecha")?.toString() ?? "";
  const totalStr = formData.get("total")?.toString() ?? "0";

  if (!fechaStr) return errState("Fecha requerida.");
  const total = Number(totalStr.replace(/[^0-9]/g, "")) || 0;
  if (total < 0) return errState("Total no puede ser negativo.");

  const fecha = fromISODate(fechaStr);

  await prisma.nequiDelDia.upsert({
    where: { fecha },
    update: { total, userId: user.id },
    create: { fecha, total, userId: user.id },
  });

  revalidatePath("/nequi");
  revalidatePath("/");
  revalidatePath("/cierre");
  return okState();
}
