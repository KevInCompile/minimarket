"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fromISODate, toISODate, startOfDayUTC } from "@/lib/dates";
import { requireValidUser, requireAdmin, requireTiendaId } from "@/lib/auth-guard";
import { okState, errState, type ActionState } from "./_state";

export type CierreState = ActionState;

const moneyString = z
  .string()
  .transform((s) => s.replace(/[^0-9-]/g, ""))
  .refine((s) => s === "" || /^-?\d+$/.test(s), { message: "Número inválido" })
  .transform((s) => (s === "" ? 0 : Number(s)));

const optionalMoneyString = z
  .string()
  .transform((s) => s.trim())
  .transform((s) => (s === "" ? null : Number(s.replace(/[^0-9-]/g, ""))));

const schema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  cajaApertura: moneyString,
  cajaCierre: moneyString,
  efectivoGuardado: moneyString,
  efectivoRealContado: optionalMoneyString,
});

export async function guardarCierreAction(
  _prev: CierreState,
  formData: FormData,
): Promise<CierreState> {
  const [user, tiendaId] = await Promise.all([
    requireValidUser(),
    requireTiendaId(),
  ]);

  const raw = {
    fecha: formData.get("fecha")?.toString() ?? "",
    cajaApertura: formData.get("cajaApertura")?.toString() ?? "0",
    cajaCierre: formData.get("cajaCierre")?.toString() ?? "0",
    efectivoGuardado: formData.get("efectivoGuardado")?.toString() ?? "0",
    efectivoRealContado: formData.get("efectivoRealContado")?.toString() ?? "",
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return errState(issue?.message ?? "Datos inválidos.", issue?.path[0]?.toString());
  }
  const { fecha, cajaApertura, cajaCierre, efectivoGuardado, efectivoRealContado } = parsed.data;
  const fechaDate = fromISODate(fecha);
  if (Number.isNaN(fechaDate.getTime())) {
    return errState("Fecha inválida.", "fecha");
  }
  const real: number | null =
    typeof efectivoRealContado === "number" ? efectivoRealContado : null;

  await prisma.cierreDiario.upsert({
    where: { fecha: fechaDate },
    update: {
      cajaApertura,
      cajaCierre,
      efectivoGuardado,
      efectivoRealContado: real,
      userIdCierre: user.id,
      tiendaId,
    },
    create: {
      fecha: fechaDate,
      cajaApertura,
      cajaCierre,
      efectivoGuardado,
      efectivoRealContado: real,
      userIdCierre: user.id,
      tiendaId,
    },
  });

  revalidatePath("/cierre");
  revalidatePath("/");
  return okState();
}

const fechaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CrearCierreState = ActionState;

export async function crearCierreVacioAction(
  _prev: CrearCierreState,
  formData: FormData,
): Promise<CrearCierreState> {
  const [user, tiendaId] = await Promise.all([
    requireValidUser(),
    requireTiendaId(),
  ]);

  const parsed = fechaSchema.safeParse({
    fecha: formData.get("fecha")?.toString() ?? "",
  });
  if (!parsed.success) return errState("Fecha inválida.");

  const fecha = fromISODate(parsed.data.fecha);
  if (Number.isNaN(fecha.getTime())) return errState("Fecha inválida.");

  const hoy = startOfDayUTC(new Date());
  if (fecha > hoy) return errState("No puede crear un cierre para un día futuro.");

  const existe = await prisma.cierreDiario.findUnique({ where: { fecha } });
  if (existe) return errState("Ya existe un cierre para esa fecha.");

  await prisma.cierreDiario.create({
    data: {
      fecha,
      cajaApertura: 0,
      cajaCierre: 0,
      efectivoGuardado: 0,
      efectivoRealContado: null,
      userIdCierre: user.id,
      tiendaId,
    },
  });

  revalidatePath("/cierre");
  return okState();
}

export async function eliminarCierreAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const tiendaId = await requireTiendaId();
  const parsed = fechaSchema.safeParse({
    fecha: formData.get("fecha")?.toString() ?? "",
  });
  if (!parsed.success) return;

  const fecha = fromISODate(parsed.data.fecha);

  const cierre = await prisma.cierreDiario.findUnique({ where: { fecha } });
  if (!cierre) return;
  if (cierre.tiendaId !== tiendaId) return;

  const [gastos, retiros, nequi] = await Promise.all([
    prisma.gasto.count({ where: { fecha, tiendaId } }),
    prisma.retiro.count({ where: { fecha, tiendaId } }),
    prisma.nequiDelDia.count({ where: { fecha, tiendaId } }),
  ]);
  if (gastos > 0 || retiros > 0 || nequi > 0) return;

  await prisma.cierreDiario.delete({ where: { fecha } });
  revalidatePath("/cierre");
  revalidatePath("/");
}

export { toISODate };
