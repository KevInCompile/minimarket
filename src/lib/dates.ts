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
 * Devuelve el rango UTC [desde, hasta] para un período identificado por
 * 'YYYY-MM'.
 *
 * El período depende del DÍA DE CORTE de la tienda:
 *  - `diaCorte = 1` (por defecto): el mes calendario, del 1 al último día.
 *  - `diaCorte = 15`: del 15 de ese mes al 14 del siguiente.
 *
 * Si el input no es válido, devuelve null.
 */
export function mesRange(
  key: string,
  diaCorte = 1,
): { desde: Date; hasta: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const corte = normalizarDiaCorte(diaCorte);
  // month es 1-based; Date.UTC usa meses 0-based.
  const desde = new Date(Date.UTC(year, month - 1, corte));
  const hasta = new Date(Date.UTC(year, month, corte - 1, 23, 59, 59, 999));
  return { desde, hasta };
}

/**
 * Normaliza el día de corte a un entero válido entre 1 y 28.
 *
 * El 29, 30 y 31 no valen porque no todos los meses los tienen; el 28
 * es el último día que existe en todos.
 */
export function normalizarDiaCorte(diaCorte: number | null | undefined): number {
  if (diaCorte == null || !Number.isFinite(diaCorte)) return 1;
  const n = Math.trunc(diaCorte);
  if (n < 1) return 1;
  if (n > 28) return 28;
  return n;
}

/**
 * Clave 'YYYY-MM' del PERÍODO que contiene `fecha`.
 *
 * Con `diaCorte = 1` coincide con `mesKey`. Con `diaCorte = 15`, una
 * fecha del 20 de octubre pertenece al período que empezó el 15 de
 * octubre (clave '2026-10'), y una del 10 de octubre al que empezó el 15
 * de septiembre (clave '2026-09').
 */
export function periodoKeyDe(fecha: Date, diaCorte = 1): string {
  const corte = normalizarDiaCorte(diaCorte);
  const dia = fecha.getUTCDate();
  // Si el día es anterior al corte, el período empezó el mes anterior.
  const ref =
    dia >= corte
      ? new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1))
      : new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() - 1, 1));
  return mesKey(ref);
}

/** Parámetros de URL que determinan el período visible. */
export type ParametrosPeriodoVisible = {
  mes?: string | null;
  desde?: string | null;
  hasta?: string | null;
};

/**
 * Período que debe mostrar el selector de mes.
 *
 * Sigue la misma prioridad que `parseFiltrosComunes`: un `mes` válido gana,
 * un rango manual no corresponde a un único período y, si no hay filtros,
 * se muestra el período en curso.
 */
export function periodoVisible(
  params: ParametrosPeriodoVisible,
  hoy: Date,
  diaCorte = 1,
): string | null {
  if (params.mes && mesRange(params.mes, diaCorte)) {
    return params.mes;
  }
  if (params.desde && params.hasta) {
    return null;
  }
  return periodoKeyDe(hoy, diaCorte);
}

/**
 * Períodos recientes para dejar utilizable el selector cuando una tienda
 * todavía no tiene movimientos. El primero es el período en curso.
 */
export function periodosIniciales(
  hoy: Date,
  diaCorte = 1,
  cantidad = 12,
): string[] {
  const total = Math.max(0, Math.trunc(cantidad));
  const periodos: string[] = [];
  let actual: string | null = periodoKeyDe(hoy, diaCorte);

  for (let i = 0; i < total && actual; i++) {
    periodos.push(actual);
    actual = mesAnterior(actual);
  }

  return periodos;
}

/** Períodos vecinos al que el usuario está viendo. */
export type NavegacionMes = {
  /** Clave 'YYYY-MM' del período anterior (null si la clave no es válida). */
  anterior: string | null;
  /** Clave 'YYYY-MM' del período siguiente (null si no se puede avanzar). */
  siguiente: string | null;
};

/**
 * Calcula los períodos vecinos del período visible.
 *
 * `siguiente` solo existe cuando el período de referencia es estrictamente
 * anterior al período en curso: nunca se puede navegar al futuro.
 */
export function navegacionMes(
  mes: string | null,
  hasta: Date,
  diaCorte = 1,
  /**
   * "Ahora" inyectable. El cliente lo pasa con el valor calculado por el
   * server para mantener server y browser en el mismo período.
   */
  ahora: Date = new Date(),
): NavegacionMes {
  const referencia = mes ?? periodoKeyDe(hasta, diaCorte);
  const anterior = mesAnterior(referencia);
  // Las claves 'YYYY-MM' se comparan bien como texto (mismo formato, mismo
  // largo): '2026-09' < '2026-10' < '2027-01'.
  const enCurso = periodoKeyDe(ahora, diaCorte);
  const puedeAvanzar = referencia < enCurso;
  const siguiente = puedeAvanzar ? mesSiguiente(referencia) : null;
  return { anterior, siguiente };
}

/**
 * Etiqueta legible de un período, según su día de corte.
 *
 * Con corte 1 es "Septiembre 2026". Con corte 15 es
 * "Del 15 de sep al 14 de oct", porque el período no coincide con un mes
 * del calendario.
 */
export function etiquetaPeriodo(key: string | null, diaCorte = 1): string | null {
  if (!key) return null;
  const corte = normalizarDiaCorte(diaCorte);
  if (corte === 1) return parseMesLabel(key);

  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;

  const MESES_CORTOS = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const inicio = new Date(Date.UTC(year, month - 1, corte));
  const fin = new Date(Date.UTC(year, month, corte - 1));
  const mismoAnio = inicio.getUTCFullYear() === fin.getUTCFullYear();
  const f = (d: Date) =>
    `${d.getUTCDate()} ${MESES_CORTOS[d.getUTCMonth()]}` +
    (mismoAnio ? "" : ` ${d.getUTCFullYear()}`);

  return `Del ${f(inicio)} al ${f(fin)}`;
}

/**
 * Devuelve la clave 'YYYY-MM' del mes que contiene `fecha`.
 */
export function mesKey(fecha: Date): string {
  const y = fecha.getUTCFullYear();
  const m = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Parte una clave 'YYYY-MM' en año y mes. Devuelve null si la clave está
 * mal formada (o si el mes no existe, como '2026-13').
 */
function partesMes(key: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * Clave 'YYYY-MM' del mes anterior al de `key`.
 *
 * '2026-10' → '2026-09'; '2026-01' → '2025-12' (cambio de año).
 * Devuelve null si la clave no es válida.
 */
export function mesAnterior(key: string): string | null {
  const partes = partesMes(key);
  if (!partes) return null;
  // Date.UTC normaliza los meses que se salen del rango (0 = diciembre
  // del año anterior, 12 = enero del año siguiente).
  return mesKey(new Date(Date.UTC(partes.year, partes.month - 2, 1)));
}

/**
 * Clave 'YYYY-MM' del mes siguiente al de `key`.
 *
 * '2026-10' → '2026-11'; '2026-12' → '2027-01' (cambio de año).
 * Devuelve null si la clave no es válida.
 */
export function mesSiguiente(key: string): string | null {
  const partes = partesMes(key);
  if (!partes) return null;
  return mesKey(new Date(Date.UTC(partes.year, partes.month, 1)));
}

/**
 * Clave 'YYYY-MM' del mes actual según el reloj del usuario (calendario
 * local, no UTC), igual que `toISODateLocal`.
 */
export function mesActual(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
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
