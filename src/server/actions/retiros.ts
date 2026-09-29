"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { fromISODate } from "@/lib/dates";
import { requireAdmin } from "@/lib/auth-guard";
import { okState, errState, type ActionState } from "./_state";

export type RetiroState = ActionState;

export async function crearRetiroAction(
  _prev: RetiroState,
  formData: FormData,
): Promise<RetiroState> {
  const user = await requireAdmin();

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
      saleDe: saleDe as "EFECTIVO" | "NEQUI" | "CAJA",
      userId: user.id,
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
  concepto: string;
  valor: number;
  saleDe: "EFECTIVO" | "NEQUI" | "CAJA";
  userId: string;
};

export async function eliminarRetiroAction(formData: FormData): Promise<RetiroState & { snapshot?: RetiroSnapshot }> {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return errState("ID requerido.");

  const retiro = await prisma.retiro.findUnique({ where: { id } });
  if (!retiro) return errState("Retiro no encontrado.");

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
      concepto: retiro.concepto,
      valor: retiro.valor,
      saleDe: retiro.saleDe as "EFECTIVO" | "NEQUI" | "CAJA",
      userId: retiro.userId,
    },
  };
}

export async function restaurarRetiroAction(snapshot: RetiroSnapshot): Promise<RetiroState> {
  const user = await requireAdmin();

  await prisma.retiro.create({
    data: {
      id: snapshot.id,
      fecha: new Date(snapshot.fecha),
      concepto: snapshot.concepto,
      valor: snapshot.valor,
      saleDe: snapshot.saleDe,
      userId: user.id,
    },
  });

  revalidatePath("/retiros");
  revalidatePath("/");
  revalidatePath("/cierre");
  return okState();
}
