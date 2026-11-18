/**
 * Reglas del módulo Préstamos (helpers puros, sin Prisma).
 *
 * Un préstamo es un REGISTRO DE CONTROL: plata que se le prestó a alguien y
 * que hay que devolver. No es un Gasto ni un Retiro, así que no toca el
 * balance: el balance se sigue cerrando con los movimientos reales.
 *
 * Estas funciones son puras a propósito: se testean sin base de datos
 * (`tests/prestamos.test.ts`) y las usan tanto la page (server) como la
 * vista (client).
 */

import { z } from "zod";
import { fromISODate, startOfDayUTC } from "./dates";
import { pickTextParam } from "./search-params";

/** Filtro de la lista por estado del préstamo. */
export type EstadoFiltro = "todos" | "pendientes" | "pagados";

/** Opciones del filtro, en el orden en que se muestran. */
export const OPCIONES_ESTADO: { valor: EstadoFiltro; label: string }[] = [
  { valor: "pendientes", label: "Pendientes" },
  { valor: "pagados", label: "Pagados" },
  { valor: "todos", label: "Todos" },
];

/** Un préstamo como lo ve la vista (serializable, sin Dates de Prisma). */
export type PrestamoResumen = {
  id: string;
  fecha: Date;
  persona: string;
  valor: number;
  nota: string | null;
  pagado: boolean;
  fechaPago: Date | null;
};

/** Datos ya validados de un préstamo nuevo. */
export type PrestamoInput = {
  fecha: Date;
  persona: string;
  valor: number;
  nota: string | null;
};

/** Campo al que apunta un error de validación, para marcar el input. */
export type CampoPrestamo = "fecha" | "persona" | "valor" | "nota";

export type ResultadoValidacion =
  | { ok: true; data: PrestamoInput }
  | { ok: false; error: string; campo: CampoPrestamo };

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

/** Dinero: acepta "180.000" o "180000" y descarta lo que no es dígito. */
const dinero = z
  .string()
  .transform((s) => s.replace(/[^0-9-]/g, ""))
  .refine((s) => s === "" || /^-?\d+$/.test(s), { message: "Número inválido." })
  .transform((s) => (s === "" ? 0 : Number(s)));

const prestamoSchema = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.")
    .refine((s) => esFechaReal(s), "Fecha inválida."),
  persona: z
    .string()
    .trim()
    .min(1, "Escriba a quién se le prestó.")
    .max(120, "Nombre demasiado largo."),
  valor: dinero.refine((v) => v > 0, "El valor debe ser mayor a cero."),
  nota: z.string().trim().max(500, "Nota demasiado larga.").optional(),
});

/**
 * ¿La fecha existe en el calendario?
 *
 * `new Date("2026-02-31")` no falla: la rueda a marzo 3. Por eso se
 * compara la fecha parseada con la que se pidió.
 */
function esFechaReal(iso: string): boolean {
  const d = fromISODate(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === iso;
}

/**
 * Valida los datos de un préstamo nuevo.
 *
 * @param raw Datos crudos del formulario.
 * @param hoy "Hoy", para no dejar registrar préstamos con fecha futura.
 */
export function validaPrestamo(
  raw: { fecha: string; persona: string; valor: string; nota?: string },
  hoy: Date,
): ResultadoValidacion {
  const parsed = prestamoSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const campo = (issue?.path[0] ?? "persona") as CampoPrestamo;
    return {
      ok: false,
      error: issue?.message ?? "Datos inválidos.",
      campo,
    };
  }

  const fecha = fromISODate(parsed.data.fecha);
  if (startOfDayUTC(fecha).getTime() > startOfDayUTC(hoy).getTime()) {
    return {
      ok: false,
      error: "No se puede registrar un préstamo con fecha futura.",
      campo: "fecha",
    };
  }

  const nota = parsed.data.nota?.trim();
  return {
    ok: true,
    data: {
      fecha,
      persona: parsed.data.persona,
      valor: parsed.data.valor,
      nota: nota ? nota : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Filtro, totales y orden
// ---------------------------------------------------------------------------

/**
 * Estado del filtro desde la URL (`?estado=pendientes`).
 *
 * Un valor desconocido (o ausente) cae en "todos": un filtro mal escrito no
 * puede dejar la lista vacía sin avisar.
 */
export function parseEstadoFiltro(
  valor: string | string[] | undefined,
): EstadoFiltro {
  const v = pickTextParam(valor);
  if (v === "pendientes" || v === "pagados") return v;
  return "todos";
}

/** Filtra la lista por estado. */
export function filtraPorEstado<T extends { pagado: boolean }>(
  prestamos: readonly T[],
  estado: EstadoFiltro,
): T[] {
  if (estado === "pendientes") return prestamos.filter((p) => !p.pagado);
  if (estado === "pagados") return prestamos.filter((p) => p.pagado);
  return [...prestamos];
}

/** Totales de la lista: todo, lo pendiente y lo ya devuelto. */
export function totalesPrestamos(
  prestamos: readonly { valor: number; pagado: boolean }[],
): {
  total: number;
  pendiente: number;
  pagado: number;
  cantidad: number;
  cantidadPendientes: number;
  cantidadPagados: number;
} {
  let pendiente = 0;
  let pagado = 0;
  let cantidadPendientes = 0;
  let cantidadPagados = 0;

  for (const p of prestamos) {
    if (p.pagado) {
      pagado += p.valor;
      cantidadPagados++;
    } else {
      pendiente += p.valor;
      cantidadPendientes++;
    }
  }

  return {
    total: pendiente + pagado,
    pendiente,
    pagado,
    cantidad: prestamos.length,
    cantidadPendientes,
    cantidadPagados,
  };
}

/**
 * Orden de la lista: los pendientes primero (lo que hay que cobrar) y, dentro
 * de cada grupo, del préstamo más reciente al más viejo.
 *
 * No muta el arreglo recibido.
 */
export function ordenaPrestamos<T extends { fecha: Date; pagado: boolean }>(
  prestamos: readonly T[],
): T[] {
  return [...prestamos].sort((a, b) => {
    if (a.pagado !== b.pagado) return a.pagado ? 1 : -1;
    return b.fecha.getTime() - a.fecha.getTime();
  });
}
