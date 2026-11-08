/**
 * Reglas del cierre diario que no dependen de la base de datos.
 *
 * Son helpers puros para que se puedan testear sin Prisma: el motor de
 * cálculo (`src/lib/calc.ts`) sigue siendo la fuente de verdad de los
 * totales, y estas funciones solo resuelven el valor por defecto de la caja
 * de apertura y el orden de presentación.
 */

import { toISODate } from "./dates";

/** Un cierre con los valores que se guardan de un día. */
export type CierreConEstado = {
  fecha: Date;
  cajaApertura: number;
  cajaCierre: number;
  efectivoGuardado: number;
  efectivoRealContado: number | null;
};

/**
 * Un cierre "cargado" es el que el usuario ya llenó.
 *
 * La fila que crea el botón "Crear cierre" queda vacía (cajaCierre y
 * efectivoGuardado en 0, sin conteo físico) y todavía no dice nada de la
 * plata en caja: no sirve ni como valor guardado ni como antecedente del
 * día siguiente.
 *
 * Ojo: `cajaApertura` NO cuenta. Un cierre recién creado puede llevar la
 * apertura propuesta y eso no significa que el día esté cerrado.
 */
export function cierreEstaCargado(c: CierreConEstado): boolean {
  return (
    c.cajaCierre !== 0 ||
    c.efectivoGuardado !== 0 ||
    c.efectivoRealContado != null
  );
}

/**
 * Caja de apertura por defecto de un día: la caja de cierre del ÚLTIMO
 * cierre anterior que el usuario llenó.
 *
 * La plata de la caja no se reinicia sola: el día arranca con lo que quedó
 * en caja el día anterior.
 *
 * Reglas:
 *  - Se ignoran los cierres de la misma fecha y los posteriores.
 *  - Un cierre vacío (recién creado, sin datos) no cuenta como antecedente:
 *    todavía no dice cuánto había en caja.
 *  - Si no hay ningún cierre anterior con datos, arranca en 0.
 */
export function cajaAperturaPorDefecto(
  cierres: readonly CierreConEstado[],
  fecha: Date,
): number {
  const limite = fecha.getTime();
  let mejor: CierreConEstado | undefined;
  for (const cierre of cierres) {
    if (!cierreEstaCargado(cierre)) continue;
    const t = cierre.fecha.getTime();
    if (t >= limite) continue;
    if (mejor === undefined || t > mejor.fecha.getTime()) mejor = cierre;
  }
  return mejor?.cajaCierre ?? 0;
}

/**
 * Caja de apertura SUGERIDA por día.
 *
 * La plata de la caja se arrastra: un día que todavía NO está cerrado
 * arranca con la caja de cierre del último cierre anterior que el usuario
 * llenó.
 *
 * Solo entra default en los días SIN cierre cargado:
 *  - Los que no tienen fila de cierre.
 *  - Los que tienen una fila vacía (recién creada, sin datos): el default
 *    es lo que se propone en el editor.
 *
 * Un día que el usuario ya cerró usa el valor guardado, que sigue siendo
 * editable desde la tarjeta.
 *
 * El default NUNCA se persiste por sí solo en una fila pendiente: se
 * propone en el input editable. Persistirlo dejaría una "entrada estimada"
 * negativa en el resumen del período.
 *
 * @param dias Días del período.
 * @param cierres Cierres conocidos (del período y el anterior a él).
 * @returns Mapa 'YYYY-MM-DD' -> caja de apertura sugerida.
 */
export function aperturasPorDefecto(args: {
  dias: readonly Date[];
  cierres: readonly CierreConEstado[];
}): Record<string, number> {
  const { dias, cierres } = args;

  const porFecha = new Map(cierres.map((c) => [toISODate(c.fecha), c]));

  const sugeridas: Record<string, number> = {};
  for (const dia of dias) {
    const key = toISODate(dia);
    const cierre = porFecha.get(key);
    // Ya está cerrado: usa el valor guardado.
    if (cierre && cierreEstaCargado(cierre)) continue;
    sugeridas[key] = cajaAperturaPorDefecto(cierres, dia);
  }
  return sugeridas;
}

/**
 * Ordena una lista de filas por fecha, de la más nueva a la más vieja.
 *
 * El listado del cierre va de más nuevo a más viejo (b-a): el día que se
 * acaba de crear queda arriba y no hay que scrollear hasta el final para
 * editarlo. No muta el arreglo recibido.
 */
export function ordenarPorFechaDescendente<T extends { fecha: Date }>(
  filas: readonly T[],
): T[] {
  return [...filas].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}
