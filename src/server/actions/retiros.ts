"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { fromISODate } from "@/lib/dates";
import { requireAdmin } from "@/lib/auth-guard";
import { okState, errState, type ActionState } from "./_state";
import type { TipoRetiro, SaleDe } from "@prisma/client";

export type RetiroState = ActionState;

const TIPOS_VALIDOS: TipoRetiro[] = [
  "ARRIENDO",
  "NOMINA",
  "SERVICIOS",
  "IMPUESTOS",
  "PRESTAMO",
  "RETIRO_PERSONAL",
  "OTRO",
];

const SALE_DE_VALIDOS: SaleDe[] = ["EFECTIVO", "NEQUI", "CAJA"];

export async function crearRetiroAction(
  _prev: RetiroState,
  formData: FormData,
): Promise<RetiroState> {
  const user = await requireAdmin();

  const fechaStr = formData.get("fecha")?.toString() ?? "";
  const tipoRaw = formData.get("tipo")?.toString() ?? "";
  const concepto = formData.get("concepto")?.toString().trim() ?? "";
  const valorStr = formData.get("valor")?.toString() ?? "";
  const saleDeRaw = formData.get("saleDe")?.toString() ?? "";
  const nota = formData.get("nota")?.toString().trim() || null;

  if (!fechaStr || !concepto || !valorStr || !saleDeRaw) {
    return errState("Todos los campos son obligatorios.");
  }
  const valor = Number(valorStr.replace(/[^0-9]/g, ""));
  if (!Number.isFinite(valor) || valor <= 0) {
    return errState("El valor debe ser un número positivo.");
  }
  if (!SALE_DE_VALIDOS.includes(saleDeRaw as SaleDe)) {
    return errState("Sale de debe ser EFECTIVO, NEQUI o CAJA.");
  }
  const tipo = (TIPOS_VALIDOS.includes(tipoRaw as TipoRetiro)
    ? tipoRaw
    : "OTRO") as TipoRetiro;

  await prisma.retiro.create({
    data: {
      fecha: fromISODate(fechaStr),
      tipo,
      concepto,
      valor,
      saleDe: saleDeRaw as SaleDe,
      nota,
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
  tipo: TipoRetiro;
  concepto: string;
  valor: number;
  saleDe: SaleDe;
  nota: string | null;
  userId: string;
};

export async function eliminarRetiroAction(
  formData: FormData,
): Promise<RetiroState & { snapshot?: RetiroSnapshot }> {
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
      tipo: retiro.tipo,
      concepto: retiro.concepto,
      valor: retiro.valor,
      saleDe: retiro.saleDe,
      nota: retiro.nota,
      userId: retiro.userId,
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
    },
  });

  revalidatePath("/retiros");
  revalidatePath("/");
  revalidatePath("/cierre");
  return okState();
}