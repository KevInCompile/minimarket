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
