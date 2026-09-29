"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { okState, errState, type ActionState } from "./_state";

export type ProveedorState = ActionState;

export async function crearProveedorAction(
  _prev: ProveedorState,
  formData: FormData,
): Promise<ProveedorState> {
  await requireAdmin();
  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  if (!nombre) return errState("Nombre requerido.");

  try {
    await prisma.proveedor.create({ data: { nombre } });
  } catch {
    return errState("Ya existe un proveedor con ese nombre.");
  }

  revalidatePath("/proveedores");
  revalidatePath("/gastos");
  return okState();
}

export async function toggleProveedorAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  const p = await prisma.proveedor.findUnique({ where: { id } });
  if (!p) return;
  await prisma.proveedor.update({
    where: { id },
    data: { activo: !p.activo },
  });
  revalidatePath("/proveedores");
}
