"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requireTiendaId } from "@/lib/auth-guard";
import { okState, errState, type ActionState } from "./_state";

export type UsuarioState = ActionState;

const schema = z.object({
  email: z.string().email(),
  nombre: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "CAJERO"]),
});

export async function crearUsuarioAction(
  _prev: UsuarioState,
  formData: FormData,
): Promise<UsuarioState> {
  await requireAdmin();
  const tiendaId = await requireTiendaId();
  const parsed = schema.safeParse({
    email: formData.get("email")?.toString() ?? "",
    nombre: formData.get("nombre")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    role: formData.get("role")?.toString() ?? "CAJERO",
  });
  if (!parsed.success) return errState("Datos inválidos. Revisá los campos.");

  const passwordHash = await hash(parsed.data.password, 10);

  try {
    await prisma.user.create({
      data: {
        email: parsed.data.email.toLowerCase().trim(),
        nombre: parsed.data.nombre,
        passwordHash,
        role: parsed.data.role,
        tiendaId,
      },
    });
  } catch {
    return errState("Ya existe un usuario con ese email.");
  }

  revalidatePath("/usuarios");
  return okState();
}

export async function toggleUsuarioAction(formData: FormData): Promise<void> {
  const tiendaId = await requireTiendaId();
  const id = formData.get("id")?.toString();
  if (!id) return;
  if (id === (await requireAdmin()).id) return;
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return;
  if (u.tiendaId !== tiendaId) return;

  await prisma.user.update({
    where: { id },
    data: { activo: !u.activo },
  });
  revalidatePath("/usuarios");
}
