/**
 * Helpers para parsear los searchParams comunes en las páginas con listas.
 *
 * Las páginas aceptan:
 *   - `mes=YYYY-MM`    → atajo al rango del mes (sobrescribe desde/hasta)
 *   - `desde=YYYY-MM-DD`, `hasta=YYYY-MM-DD` → rango manual
 *   - Filtros específicos por página (los pasa la page a través de additional).
 *
 * Resuelve con la prioridad:
 *   mes > desde/hasta > default
 *
 * Devuelve también la `mesKey` efectiva (útil para el componente cliente
 * que necesita saber qué mes está resaltado en el selector).
 */
import {
  fromISODate,
  mesAnterior,
  periodoKeyDe,
  mesRange,
  mesSiguiente,
  startOfDayUTC,
  toISODate,
  toISODateLocal,
  endOfDayUTC,
} from "./dates";
import { previousPeriodRange } from "./calc";

export type FiltrosComunes = {
  /** Fecha inicial del rango (UTC, inicio del día). */
  desde: Date;
  /** Fecha final del rango (UTC, final del día). */
  hasta: Date;
  /** Clave 'YYYY-MM' del período, si el rango vino de un atajo. */
  mes: string | null;
};

/**
 * Determina los filtros comunes a partir de los `searchParams` recibidos en
 * una page Next.js (Promise). Si `mes` está presente y es válido, devuelve el
 * rango del período y `mes=key`. Si no, usa `desde`/`hasta` o los `defaults`.
 *
 * @param searchParams Promise de searchParams típica de Next.js 16.
 * @param defaults Por defecto: desde = inicio del período actual, hasta = hoy UTC.
 * @param diaCorte Día del mes (1-28) en que se reinicia el período de la
 *   tienda. Con 1 es el mes calendario.
 */
export async function parseFiltrosComunes(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
  defaults?: { desde?: Date; hasta?: Date },
  diaCorte = 1,
): Promise<FiltrosComunes> {
  const params = await searchParams;

  const desdeRaw = pickString(params.desde);
  const hastaRaw = pickString(params.hasta);
  const mesRaw = pickString(params.mes);

  // 1) Período como atajo (mayor prioridad)
  if (mesRaw) {
    const range = mesRange(mesRaw, diaCorte);
    if (range) {
      return { desde: range.desde, hasta: range.hasta, mes: mesRaw };
    }
  }

  // 2) Rango manual desde/hasta
  if (desdeRaw && hastaRaw) {
    const desde = startOfDayUTC(fromISODate(desdeRaw));
    const hasta = endOfDayUTC(fromISODate(hastaRaw));
    return { desde, hasta, mes: null };
  }

  // 3) Defaults: el período en curso según el día de corte de la tienda.
  const hoy = startOfDayUTC(new Date());
  const defaultDesde =
    defaults?.desde ??
    mesRange(periodoKeyDe(hoy, diaCorte), diaCorte)?.desde ??
    new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const defaultHasta = defaults?.hasta ?? endOfDayUTC(hoy);

  return {
    desde: startOfDayUTC(defaultDesde),
    hasta: defaultHasta,
    mes: periodoKeyDe(defaultDesde, diaCorte),
  };
}

/**
 * Convierte filtros a query string para navegar (sin valores vacíos).
 */
export function filtrosToQuery(filtros: {
  desde?: Date | null;
  hasta?: Date | null;
  mes?: string | null;
}): string {
  const params = new URLSearchParams();
  if (filtros.mes) {
    params.set("mes", filtros.mes);
  } else {
    if (filtros.desde) params.set("desde", toISODate(filtros.desde));
    if (filtros.hasta) params.set("hasta", toISODate(filtros.hasta));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * Fecha ('YYYY-MM-DD') por defecto de los formularios de registro
 * (gasto, retiro, cierre) según el período que el usuario está viendo.
 *
 * La regla es "la fecha que está mirando el usuario":
 *   - mes actual           → hoy
 *   - mes pasado           → el último día de ese mes
 *   - rango manual pasado  → el día en que termina el rango
 *   - rango en el futuro   → hoy (nunca una fecha futura)
 *
 * Se usa el calendario LOCAL (`toISODateLocal`) porque el usuario piensa en
 * su reloj: en Colombia (UTC-5) la fecha UTC ya es la del día siguiente
 * después de las 19:00.
 */
export function fechaPorDefectoPara(hasta: Date): string {
  const ahora = new Date();
  const limite = hasta.getTime() < ahora.getTime() ? hasta : ahora;
  return toISODateLocal(limite);
}

/**
 * Períodos vecinos al que el usuario está viendo, para las flechas de
 * navegación del selector de período.
 */
export type NavegacionMes = {
  /** Clave 'YYYY-MM' del período anterior (null si la clave no es válida). */
  anterior: string | null;
  /** Clave 'YYYY-MM' del período siguiente (null si no se puede avanzar). */
  siguiente: string | null;
};

/**
 * Calcula los períodos vecinos del período visible.
 *
 * El período de referencia es `mes` cuando viene del atajo `?mes=YYYY-MM`; si
 * no, es el período en que termina el rango.
 *
 * `siguiente` solo existe cuando el período de referencia es ESTRICTAMENTE
 * anterior al período en curso: nunca se puede navegar al futuro. Con día
 * de corte 15 y hoy 3 de noviembre, el período en curso es el que empezó el
 * 15 de octubre, así que la flecha derecha queda deshabilitada en ése.
 */
export function navegacionMes(
  mes: string | null,
  hasta: Date,
  diaCorte = 1,
): NavegacionMes {
  const referencia = mes ?? periodoKeyDe(hasta, diaCorte);
  const anterior = mesAnterior(referencia);
  // Las claves 'YYYY-MM' se comparan bien como texto (mismo formato, mismo
  // largo): '2026-09' < '2026-10' < '2027-01'.
  const enCurso = periodoKeyDe(new Date(), diaCorte);
  const puedeAvanzar = referencia < enCurso;
  const siguiente = puedeAvanzar ? mesSiguiente(referencia) : null;
  return { anterior, siguiente };
}

function pickString(v: string | string[] | undefined): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

/**
 * Periodo contra el que se compara el periodo que el usuario está viendo.
 *
 * `esMes` dice si la comparación es contra el mes calendario anterior (el
 * caption dice "vs mes anterior") o contra un rango libre (el caption dice
 * "vs periodo anterior").
 */
export type PeriodoComparacion = {
  /** Inicio del periodo de comparación (UTC, inicio del día). */
  desde: Date;
  /** Fin del periodo de comparación (UTC, final del día). */
  hasta: Date;
  /** `true` cuando la comparación es contra el mes calendario anterior. */
  esMes: boolean;
};

/**
 * Decide contra qué periodo se compara el periodo visible.
 *
 * - Con `mes` ('YYYY-MM') la comparación es contra el MES CALENDARIO
 *   ANTERIOR: "Octubre" se compara con "Septiembre" y no con "los 31 días
 *   previos" (que serían del 31 de agosto al 30 de septiembre). Es lo que el
 *   usuario espera cuando ve el rótulo "vs mes anterior".
 * - Sin `mes` (rango manual `desde`/`hasta`) la comparación es contra el
 *   rango inmediatamente anterior del mismo largo, que es lo que corresponde
 *   a un período arbitrario.
 * - Una clave de mes inválida cae al rango anterior: nunca se rompe la vista.
 */
export function periodoComparacion(
  mes: string | null,
  desde: Date,
  hasta: Date,
  diaCorte = 1,
): PeriodoComparacion {
  if (mes) {
    const claveAnterior = mesAnterior(mes);
    const rango = claveAnterior ? mesRange(claveAnterior, diaCorte) : null;
    if (rango) {
      return { desde: rango.desde, hasta: rango.hasta, esMes: true };
    }
  }
  const previo = previousPeriodRange(desde, hasta);
  return { desde: previo.desde, hasta: previo.hasta, esMes: false };
}
