"use server";

import { revalidatePath } from "next/cache";
import type { PagadoCon } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fromISODate } from "@/lib/dates";
import { requireValidUser, requireAdmin, requireTiendaId } from "@/lib/auth-guard";
import { okState, errState, type ActionState } from "./_state";

export type GastoState = ActionState;

/**
 * Formas de pago admitidas. Mismo dominio que el enum `PagadoCon` de Prisma:
 * la lista vive acá para validar en el servidor lo que el formulario ofrece.
 */
const PAGADO_CON: readonly PagadoCon[] = ["CAJA", "EFECTIVO", "TRANSFERENCIA"];

/**
 * Tope de filas por envío. Evita que un formulario manipulado pida miles de
 * inserts dentro de una sola transacción.
 */
const MAX_FILAS = 200;

/** Una fila del formulario: un gasto con su proveedor, valor, pago y nota. */
type FilaGasto = {
  proveedor: string;
  valor: number;
  pagadoCon: PagadoCon;
  nota: string | null;
};

type ParseoFilas =
  | { ok: true; fecha: Date; filas: FilaGasto[] }
  | { ok: false; error: string };

/**
 * Convierte el texto de un valor a número.
 *
 * Solo se aceptan dígitos: el usuario escribe "50.000" o "$50.000" y ambos
 * valen 50000. Lo que no queda con dígitos se descarta.
 */
function valorANumero(texto: string): number {
  const digitos = texto.replace(/[^0-9]/g, "");
  if (!digitos) return 0;
  const n = Number(digitos);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Cuántas filas trae el formulario.
 *
 * El campo oculto `filas` es la fuente normal. Si no viene (o no es un entero
 * positivo) se escanean las claves `valor_N` para no perder filas.
 */
function contarFilas(formData: FormData): number {
  const declarado = Number(formData.get("filas")?.toString() ?? "");
  if (Number.isInteger(declarado) && declarado > 0) {
    return Math.min(declarado, MAX_FILAS);
  }
  let maximo = -1;
  for (const clave of formData.keys()) {
    const m = /^valor_(\d+)$/.exec(clave);
    if (!m) continue;
    const indice = Number(m[1]);
    if (indice > maximo) maximo = indice;
  }
  return maximo + 1;
}

/**
 * Lee y valida todas las filas del formulario.
 *
 * Los campos van indexados (`proveedor_0`, `valor_0`, `pagadoCon_0`,
 * `nota_0`, `proveedor_1`, ...) para que las filas no se desalineen si una
 * viene vacía. Todas comparten la misma `fecha`.
 *
 * Si una fila falla, el error dice cuál es la que hay que corregir.
 */
function parsearFilasGasto(formData: FormData): ParseoFilas {
  const fechaStr = formData.get("fecha")?.toString().trim() ?? "";
  if (!fechaStr) return { ok: false, error: "La fecha es obligatoria." };

  const fecha = fromISODate(fechaStr);
  if (Number.isNaN(fecha.getTime())) {
    return { ok: false, error: "La fecha no es válida." };
  }

  const cantidad = contarFilas(formData);
  if (cantidad === 0) {
    return { ok: false, error: "Registre al menos un gasto." };
  }

  const filas: FilaGasto[] = [];
  for (let i = 0; i < cantidad; i++) {
    const etiqueta = `Fila ${i + 1}:`;
    const proveedor = formData.get(`proveedor_${i}`)?.toString().trim() ?? "";
    const valorStr = formData.get(`valor_${i}`)?.toString() ?? "";
    const pagadoCon = formData.get(`pagadoCon_${i}`)?.toString() ?? "";
    const nota = formData.get(`nota_${i}`)?.toString().trim() || null;

    if (!proveedor) {
      return { ok: false, error: `${etiqueta} el proveedor es obligatorio.` };
    }

    const valor = valorANumero(valorStr);
    if (valor <= 0) {
      return {
        ok: false,
        error: `${etiqueta} el valor debe ser un número positivo.`,
      };
    }

    const pago = PAGADO_CON.find((p) => p === pagadoCon);
    if (!pago) {
      return {
        ok: false,
        error: `${etiqueta} "pagado con" debe ser CAJA, EFECTIVO o TRANSFERENCIA.`,
      };
    }

    filas.push({ proveedor, valor, pagadoCon: pago, nota });
  }

  return { ok: true, fecha, filas };
}

/**
 * Registra N gastos del mismo día en una sola transacción.
 *
 * Todas las filas comparten la `fecha` del formulario. Si una sola fila falla,
 * no se crea ninguna: la transacción se revierte entera.
 */
export async function crearGastoAction(
  _prev: GastoState,
  formData: FormData,
): Promise<GastoState> {
  const [user, tiendaId] = await Promise.all([
    requireValidUser(),
    requireTiendaId(),
  ]);

  const parseo = parsearFilasGasto(formData);
  if (!parseo.ok) return errState(parseo.error);

  const { fecha, filas } = parseo;

  try {
    await prisma.$transaction(async (tx) => {
      for (const fila of filas) {
        const proveedor = await tx.proveedor.upsert({
          where: { nombre_tiendaId: { nombre: fila.proveedor, tiendaId } },
          update: {},
          create: { nombre: fila.proveedor, tiendaId },
        });

        await tx.gasto.create({
          data: {
            fecha,
            proveedorId: proveedor.id,
            valor: fila.valor,
            pagadoCon: fila.pagadoCon,
            nota: fila.nota,
            userId: user.id,
            tiendaId,
          },
        });
      }
    });
  } catch (error) {
    console.error("[gastos] no se pudieron registrar los gastos:", error);
    return errState("No se pudieron registrar los gastos. Intente de nuevo.");
  }

  revalidatePath("/gastos");
  revalidatePath("/");
  revalidatePath("/cierre");
  return okState();
}

type GastoSnapshot = {
  id: string;
  fecha: string;
  proveedorId: string;
  valor: number;
  pagadoCon: "CAJA" | "EFECTIVO" | "TRANSFERENCIA";
  nota: string | null;
  userId: string;
  tiendaId: string;
  proveedorNombre: string;
};

export async function eliminarGastoAction(
  formData: FormData,
): Promise<GastoState & { snapshot?: GastoSnapshot }> {
  await requireAdmin();
  const tiendaId = await requireTiendaId();
  const id = formData.get("id")?.toString();
  if (!id) return errState("ID requerido.");

  const gasto = await prisma.gasto.findUnique({
    where: { id },
    include: { proveedor: { select: { nombre: true } } },
  });
  if (!gasto) return errState("Gasto no encontrado.");
  if (gasto.tiendaId !== tiendaId) {
    return errState("No tiene permisos para eliminar este gasto.");
  }

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
      pagadoCon: gasto.pagadoCon as "CAJA" | "EFECTIVO" | "TRANSFERENCIA",
      nota: gasto.nota,
      userId: gasto.userId,
      tiendaId: gasto.tiendaId,
      proveedorNombre: gasto.proveedor.nombre,
    },
  };
}

export async function restaurarGastoAction(
  snapshot: GastoSnapshot,
): Promise<GastoState> {
  const user = await requireValidUser();

  const proveedor = await prisma.proveedor.upsert({
    where: { nombre_tiendaId: { nombre: snapshot.proveedorNombre, tiendaId: snapshot.tiendaId } },
    update: {},
    create: { nombre: snapshot.proveedorNombre, tiendaId: snapshot.tiendaId },
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
      tiendaId: snapshot.tiendaId,
    },
  });

  revalidatePath("/gastos");
  revalidatePath("/");
  revalidatePath("/cierre");
  return okState();
}
