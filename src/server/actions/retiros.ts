"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { fromISODate } from "@/lib/dates";
import { requireAdmin, requireTiendaId } from "@/lib/auth-guard";
import { okState, errState, type ActionState } from "./_state";
import type { TipoRetiro, SaleDe } from "@prisma/client";

export type RetiroState = ActionState;

export async function crearRetiroAction(
  _prev: RetiroState,
  formData: FormData,
): Promise<RetiroState> {
  const [user, tiendaId] = await Promise.all([
    requireAdmin(),
    requireTiendaId(),
  ]);

  const fechaStr = formData.get("fecha")?.toString() ?? "";
  const concepto = formData.get("concepto")?.toString().trim() ?? "";
  const valorStr = formData.get("valor")?.toString() ?? "";
  const saleDe = formData.get("saleDe")?.toString() ?? "";

  if (!fechaStr || !concepto || !valorStr || !saleDe) {
    return errState("Todos los campos son obligatorios.");
  }
  const valor = Number(valorStr.replace(/[^0-9]/g, ""));
  if (!Number.isFinite(valor) || valor <= 0) {
    return errState("El valor debe ser un número positivo.");
  }
  if (!["EFECTIVO", "NEQUI", "CAJA"].includes(saleDe)) {
    return errState("Sale de debe ser EFECTIVO, NEQUI o CAJA.");
  }

  await prisma.retiro.create({
    data: {
      fecha: fromISODate(fechaStr),
      concepto,
      valor,
      saleDe: saleDe as SaleDe,
      userId: user.id,
      tiendaId,
    },
  });

  revalidatePath("/retiros");
  revalidatePath("/");
  revalidatePath("/cierre");
  return okState();
}

type RetiroSnapshot = {
  id: string;
  fecha: string;
  tipo: TipoRetiro;
  concepto: string;
  valor: number;
  saleDe: SaleDe;
  nota: string | null;
  userId: string;
  tiendaId: string;
};

export async function eliminarRetiroAction(
  formData: FormData,
): Promise<RetiroState & { snapshot?: RetiroSnapshot }> {
  await requireAdmin();
  const tiendaId = await requireTiendaId();
  const id = formData.get("id")?.toString();
  if (!id) return errState("ID requerido.");

  const retiro = await prisma.retiro.findUnique({ where: { id } });
  if (!retiro) return errState("Retiro no encontrado.");
  if (retiro.tiendaId !== tiendaId) {
    return errState("No tiene permisos para eliminar este retiro.");
  }

  await prisma.retiro.delete({ where: { id } });

  revalidatePath("/retiros");
  revalidatePath("/");
  revalidatePath("/cierre");

  return {
    ok: true,
    ts: Date.now(),
    snapshot: {
      id: retiro.id,
      fecha: retiro.fecha.toISOString(),
      tipo: retiro.tipo,
      concepto: retiro.concepto,
      valor: retiro.valor,
      saleDe: retiro.saleDe as SaleDe,
      nota: retiro.nota,
      userId: retiro.userId,
      tiendaId: retiro.tiendaId,
    },
  };
}

export async function restaurarRetiroAction(
  snapshot: RetiroSnapshot,
): Promise<RetiroState> {
  const user = await requireAdmin();

  await prisma.retiro.create({
    data: {
      id: snapshot.id,
      fecha: new Date(snapshot.fecha),
      tipo: snapshot.tipo,
      concepto: snapshot.concepto,
      valor: snapshot.valor,
      saleDe: snapshot.saleDe,
      nota: snapshot.nota,
      userId: user.id,
      tiendaId: snapshot.tiendaId,
    },
  });

  revalidatePath("/retiros");
  revalidatePath("/");
  revalidatePath("/cierre");
  return okState();
}
