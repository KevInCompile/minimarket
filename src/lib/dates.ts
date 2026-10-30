/**
 * Helpers de fechas.
 */

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number];

export function startOfDayUTC(fecha: Date): Date {
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
}

export function endOfDayUTC(fecha: Date): Date {
  const d = startOfDayUTC(fecha);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export function toISODate(fecha: Date): string {
  const y = fecha.getUTCFullYear();
  const m = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const d = String(fecha.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Convierte a 'YYYY-MM-DD' usando la fecha del reloj del usuario.
 *
 * `toISODate` usa UTC, que es lo correcto para serializar fechas que ya
 * viven en UTC (queries, comparaciones, fechas almacenadas).
 *
 * Para el VALOR POR DEFECTO de un input de fecha la regla es otra: el
 * usuario piensa en su reloj, no en UTC. En Colombia (UTC-5) a las 19:00
 * la fecha UTC ya es la del día siguiente, así que el formulario se
 * abría con "mañana" en vez de "hoy". Por eso los formularios usan esta
 * función y no `toISODate`.
 */
export function toISODateLocal(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dateInRangeUTC(fecha: Date, desde: Date, hasta: Date): boolean {
  const t = startOfDayUTC(fecha).getTime();
  return (
    t >= startOfDayUTC(desde).getTime() && t <= startOfDayUTC(hasta).getTime()
  );
}

export function excelSerialToDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000);
}

/**
 * Etiqueta legible de un mes (ej. "Septiembre 2026"). Usada por el selector
 * de mes en los filtros.
 */
const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function parseMesLabel(key: string): string | null {
  // Acepta 'YYYY-MM', devuelve 'Septiembre 2026'.
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${MESES[month - 1]} ${year}`;
}

/**
 * Devuelve el rango UTC [desde, hasta] para un mes identificado por
 * 'YYYY-MM'. 'desde' es el primer día del mes a 00:00:00 UTC, 'hasta'
 * es el último día del mes a 23:59:59.999 UTC.
 *
 * Si el input no es válido, devuelve null.
 */
export function mesRange(key: string): { desde: Date; hasta: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const desde = new Date(Date.UTC(year, month - 1, 1));
  const hasta = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { desde, hasta };
}

/**
 * Devuelve la clave 'YYYY-MM' del mes que contiene `fecha`.
 */
export function mesKey(fecha: Date): string {
  const y = fecha.getUTCFullYear();
  const m = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function diaSemana(fecha: Date): DiaSemana {
  // Para mostrar el día correcto en la zona del usuario, usamos los
  // componentes locales (que serán el día correcto en su zona horaria).
  // Esto es solo cosmético: las comparaciones internas usan UTC.
  const local = new Date(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth(),
    fecha.getUTCDate(),
  );
  return DIAS_SEMANA[local.getDay()];
}

export function formatShortDate(fecha: Date): string {
  const local = new Date(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth(),
    fecha.getUTCDate(),
  );
  return local.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatLongDate(fecha: Date): string {
  const local = new Date(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth(),
    fecha.getUTCDate(),
  );
  return local.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
