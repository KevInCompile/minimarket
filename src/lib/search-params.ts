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
  mesActual,
  mesAnterior,
  mesKey,
  mesRange,
  mesSiguiente,
  startOfDayUTC,
  toISODate,
  toISODateLocal,
  endOfDayUTC,
} from "./dates";

export type FiltrosComunes = {
  /** Fecha inicial del rango (UTC, inicio del día). */
  desde: Date;
  /** Fecha final del rango (UTC, final del día). */
  hasta: Date;
  /** Clave 'YYYY-MM' si el rango vino de un atajo de mes. */
  mes: string | null;
};

/**
 * Determina los filtros comunes a partir de los `searchParams` recibidos en
 * una page Next.js (Promise). Si `mes` está presente y es válido, devuelve el
 * rango del mes y `mes=key`. Si no, usa `desde`/`hasta` o los `defaults`.
 *
 * @param searchParams Promise de searchParams típica de Next.js 16.
 * @param defaults Por defecto: desde = primer día del mes actual UTC, hasta = hoy UTC.
 */
export async function parseFiltrosComunes(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
  defaults?: { desde?: Date; hasta?: Date },
): Promise<FiltrosComunes> {
  const params = await searchParams;

  const desdeRaw = pickString(params.desde);
  const hastaRaw = pickString(params.hasta);
  const mesRaw = pickString(params.mes);

  // 1) Mes como atajo (mayor prioridad)
  if (mesRaw) {
    const range = mesRange(mesRaw);
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

  // 3) Defaults: si no se pasa nada, todo el mes actual UTC.
  const hoy = startOfDayUTC(new Date());
  const defaultDesde =
    defaults?.desde ?? new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const defaultHasta = defaults?.hasta ?? endOfDayUTC(hoy);

  return {
    desde: startOfDayUTC(defaultDesde),
    hasta: defaultHasta,
    mes: mesKey(defaultDesde),
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
 * Meses vecinos al que el usuario está viendo, para las flechas de
 * navegación del selector de mes.
 */
export type NavegacionMes = {
  /** Clave 'YYYY-MM' del mes anterior (null si la clave no es válida). */
  anterior: string | null;
  /** Clave 'YYYY-MM' del mes siguiente (null si no se puede avanzar). */
  siguiente: string | null;
};

/**
 * Calcula los meses vecinos del período visible.
 *
 * El mes de referencia es `mes` cuando viene del atajo `?mes=YYYY-MM`; si
 * no, es el mes en que termina el rango (`mesKey(hasta)`).
 *
 * `siguiente` solo existe cuando el mes de referencia es ESTRICTAMENTE
 * anterior al mes actual: nunca se puede navegar al futuro. Por eso, en el
 * mes actual la flecha derecha queda deshabilitada.
 */
export function navegacionMes(mes: string | null, hasta: Date): NavegacionMes {
  const referencia = mes ?? mesKey(hasta);
  const anterior = mesAnterior(referencia);
  // Las claves 'YYYY-MM' se comparan bien como texto (mismo formato, mismo
  // largo): '2026-09' < '2026-10' < '2027-01'.
  const puedeAvanzar = referencia < mesActual();
  const siguiente = puedeAvanzar ? mesSiguiente(referencia) : null;
  return { anterior, siguiente };
}

function pickString(v: string | string[] | undefined): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}
