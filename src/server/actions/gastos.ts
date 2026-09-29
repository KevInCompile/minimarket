"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { fromISODate } from "@/lib/dates";
import { requireValidUser, requireAdmin } from "@/lib/auth-guard";
import { okState, errState, type ActionState } from "./_state";

export type GastoState = ActionState;

export async function crearGastoAction(
  _prev: GastoState,
  formData: FormData,
): Promise<GastoState> {
  const user = await requireValidUser();

  const fechaStr = formData.get("fecha")?.toString() ?? "";
  const proveedorNombre = formData.get("proveedor")?.toString().trim() ?? "";
  const valorStr = formData.get("valor")?.toString() ?? "";
  const pagadoCon = formData.get("pagadoCon")?.toString() ?? "";
  const nota = formData.get("nota")?.toString().trim() || null;

  if (!fechaStr || !proveedorNombre || !valorStr || !pagadoCon) {
    return errState("Todos los campos son obligatorios.");
  }
  const fecha = fromISODate(fechaStr);
  const valor = Number(valorStr.replace(/[^0-9]/g, ""));
  if (!Number.isFinite(valor) || valor <= 0) {
    return errState("El valor debe ser un número positivo.");
  }
  if (pagadoCon !== "CAJA" && pagadoCon !== "EFECTIVO") {
    return errState("Pagado con debe ser CAJA o EFECTIVO.");
  }

  const proveedor = await prisma.proveedor.upsert({
    where: { nombre: proveedorNombre },
    update: {},
    create: { nombre: proveedorNombre },
  });

  await prisma.gasto.create({
    data: {
      fecha,
      proveedorId: proveedor.id,
      valor,
      pagadoCon,
      nota,
      userId: user.id,
    },
  });

  revalidatePath("/gastos");
  revalidatePath("/");
  revalidatePath("/cierre");
  return okState();
}

/**
 * Snapshot del gasto eliminado para permitir undo dentro de los 5s.
 */
type GastoSnapshot = {
  id: string;
  fecha: string;
  proveedorId: string;
  valor: number;
  pagadoCon: "CAJA" | "EFECTIVO";
  nota: string | null;
  userId: string;
  proveedorNombre: string;
};

export async function eliminarGastoAction(formData: FormData): Promise<GastoState & { snapshot?: GastoSnapshot }> {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return errState("ID requerido.");

  const gasto = await prisma.gasto.findUnique({
    where: { id },
    include: { proveedor: { select: { nombre: true } } },
  });
  if (!gasto) return errState("Gasto no encontrado.");

  await prisma.gasto.delete({ where: { id } });

  revalidatePath("/gastos");
  revalidatePath("/");
  revalidatePath("/cierre");

  return {
    ok: true,
    ts: Date.now(),
    snapshot: {
      id: gasto.id,
      fecha: gasto.fecha.toISOString(),
      proveedorId: gasto.proveedorId,
      valor: gasto.valor,
      pagadoCon: gasto.pagadoCon as "CAJA" | "EFECTIVO",
      nota: gasto.nota,
      userId: gasto.userId,
      proveedorNombre: gasto.proveedor.nombre,
    },
  };
}

/**
 * Restaura un gasto eliminado. Llamado por el botón "Deshacer" del toast.
 */
export async function restaurarGastoAction(snapshot: GastoSnapshot): Promise<GastoState> {
  const user = await requireValidUser();

  const proveedor = await prisma.proveedor.upsert({
    where: { nombre: snapshot.proveedorNombre },
    update: {},
    create: { nombre: snapshot.proveedorNombre },
  });

  await prisma.gasto.create({
    data: {
      id: snapshot.id,
      fecha: new Date(snapshot.fecha),
      proveedorId: proveedor.id,
      valor: snapshot.valor,
      pagadoCon: snapshot.pagadoCon,
      nota: snapshot.nota,
      userId: snapshot.userId === user.id ? user.id : user.id,
    },
  });

  revalidatePath("/gastos");
  revalidatePath("/");
  revalidatePath("/cierre");
  return okState();
}
