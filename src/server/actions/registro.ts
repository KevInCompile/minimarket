"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { errState, type ActionState } from "./_state";

export type RegistroState = ActionState;

const schema = z.object({
  email: z.string().email("Email inválido").max(100),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100),
  nombre: z
    .string()
    .min(2, "Ingrese su nombre")
    .max(100),
  nombreTienda: z
    .string()
    .min(2, "Ingrese el nombre de la tienda")
    .max(100),
  slug: z
    .string()
    .min(2, "Ingrese un identificador para la tienda")
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Solo letras minúsculas, números y guiones",
    ),
});

export async function registroAction(
  _prev: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString() ?? "";
  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const nombreTienda = formData.get("nombreTienda")?.toString().trim() ?? "";
  const slug = formData.get("slug")?.toString().trim().toLowerCase() ?? "";

  const parsed = schema.safeParse({ email, password, nombre, nombreTienda, slug });
  if (!parsed.success) {
    return errState(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  // Verificar unicidad antes de crear
  const [existingEmail, existingSlug] = await Promise.all([
    prisma.user.findUnique({ where: { email: parsed.data.email } }),
    prisma.tienda.findUnique({ where: { slug: parsed.data.slug } }),
  ]);
  if (existingEmail) return errState("Ya existe un usuario con ese email.");
  if (existingSlug)
    return errState("Ya existe una tienda con ese identificador. Elija otro.");

  const passwordHash = await hash(parsed.data.password, 10);

  // Crear tienda + user ADMIN en transacción
  await prisma.$transaction(async (tx) => {
    const tienda = await tx.tienda.create({
      data: {
        nombre: parsed.data.nombreTienda,
        slug: parsed.data.slug,
      },
    });
    await tx.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        nombre: parsed.data.nombre,
        role: "ADMIN",
        tiendaId: tienda.id,
      },
    });
  });

  // Redirige al login con flag para mostrar mensaje de éxito
  redirect("/login?registrado=1");
}
