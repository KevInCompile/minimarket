/**
 * Motor de cálculo de minimarket.
 *
 * Reglas de negocio (copiadas del Excel Control_Caja):
 *
 * - Gastos con pagadoCon=CAJA salen de la plata que entra durante el día
 *   (no tocan el efectivo guardado).
 * - Gastos con pagadoCon=EFECTIVO salen del efectivo guardado acumulado.
 * - Retiros con saleDe=EFECTIVO salen del efectivo guardado acumulado.
 * - Retiros con saleDe=NEQUI salen del saldo Nequi acumulado.
 * - El efectivo guardado nunca queda en negativo (chequeo del Excel).
 * - La entrada estimada del día = (caja cierre - caja apertura) + gastos de caja.
 * - El descuadre = efectivo real contado - efectivo acumulado (solo si hay conteo).
 */

import type { PagadoCon, SaleDe } from "@prisma/client";
import { startOfDayUTC } from "./dates";

export type CierreInput = {
  fecha: Date;
  cajaApertura: number;
  cajaCierre: number;
  efectivoGuardado: number;
  efectivoRealContado: number | null;
};

export type GastoForCalc = {
  fecha: Date;
  proveedor: string;
  valor: number;
  pagadoCon: PagadoCon;
};

export type RetiroForCalc = {
  fecha: Date;
  concepto: string;
  valor: number;
  saleDe: SaleDe;
};

export type NequiForCalc = {
  fecha: Date;
  total: number;
};

export type CierreDiarioComputed = CierreInput & {
  gastosCaja: number;
  gastosEfectivo: number;
  totalGastos: number;
  retirosEfectivo: number;
  retirosNequi: number;
  retirosCaja: number;
  entradaEstimada: number;
  efectivoAcumulado: number;
  nequiAcumulado: number;
  nequiDelDia: number;
  descuadre: number | null;
};

export type BalanceGeneral = {
  desde: Date;
  hasta: Date;
  gastosCaja: number;
  gastosEfectivo: number;
  totalGastos: number;
  retirosEfectivo: number;
  retirosNequi: number;
  retirosCaja: number;
  totalRetiros: number;
  efectivoGuardadoPeriodo: number;
  efectivoRealUltimoConteo: number | null;
  ultimoCajaCierre: number;
  // Los saldos actuales reflejan el estado al final del periodo, usando
  // el ciclo completo desde el primer día con datos.
  saldoEfectivoActual: number;
  nequiRecibidoPeriodo: number;
  saldoNequiActual: number;
  totalDisponible: number;
  puntoMasBajoEfectivo: number;
  diasConDescuadre: number;
};

export type RankingProveedor = {
  proveedor: string;
  total: number;
  porcentaje: number;
};

function startOfDay(d: Date): Date {
  return startOfDayUTC(d);
}

function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function sumBy<T>(
  items: T[],
  pred: (t: T) => boolean,
  pick: (t: T) => number,
): number {
  let s = 0;
  for (const it of items) if (pred(it)) s += pick(it);
  return s;
}

/**
 * Calcula el cierre diario computado para una fecha específica,
 * dados los movimientos del día y los saldos acumulados previos.
 */
export function computeCierreDiario(args: {
  cierre: CierreInput;
  gastosDelDia: GastoForCalc[];
  retirosDelDia: RetiroForCalc[];
  nequiDelDia: number;
  prevEfectivoAcumulado: number;
  prevNequiAcumulado: number;
}): CierreDiarioComputed {
  const { cierre, gastosDelDia, retirosDelDia, nequiDelDia } = args;

  const gastosCaja = sumBy(
    gastosDelDia,
    (g) => g.pagadoCon === "CAJA",
    (g) => g.valor,
  );
  const gastosEfectivo = sumBy(
    gastosDelDia,
    (g) => g.pagadoCon === "EFECTIVO",
    (g) => g.valor,
  );
  const retirosEfectivo = sumBy(
    retirosDelDia,
    (r) => r.saleDe === "EFECTIVO",
    (r) => r.valor,
  );
  const retirosNequi = sumBy(
    retirosDelDia,
    (r) => r.saleDe === "NEQUI",
    (r) => r.valor,
  );
  const retirosCaja = sumBy(
    retirosDelDia,
    (r) => r.saleDe === "CAJA",
    (r) => r.valor,
  );

  const totalGastos = gastosCaja + gastosEfectivo;
  const entradaEstimada =
    cierre.cajaCierre - cierre.cajaApertura + gastosCaja;

  const efectivoAcumulado =
    args.prevEfectivoAcumulado +
    cierre.efectivoGuardado -
    gastosEfectivo -
    retirosEfectivo;

  const nequiAcumulado =
    args.prevNequiAcumulado + nequiDelDia - retirosNequi;

  const descuadre =
    cierre.efectivoRealContado == null
      ? null
      : cierre.efectivoRealContado - efectivoAcumulado;

  return {
    ...cierre,
    gastosCaja,
    gastosEfectivo,
    totalGastos,
    retirosEfectivo,
    retirosNequi,
    retirosCaja,
    entradaEstimada,
    efectivoAcumulado,
    nequiAcumulado,
    nequiDelDia,
    descuadre,
  };
}

/**
 * Devuelve la serie de cierres diarios computados para un rango,
 * ordenados por fecha ascendente, asumiendo saldo inicial 0.
 *
 * Si se pasan días sin cierre pero con movimientos, esos días también aparecen
 * (con cajaApertura=0, cajaCierre=0, etc.) para que los acumulados reflejen
 * los movimientos aunque no se haya hecho el cierre formal.
 */
export function serieCierres(args: {
  desde: Date;
  hasta: Date;
  cierres: CierreInput[];
  gastos: GastoForCalc[];
  retiros: RetiroForCalc[];
  nequi: NequiForCalc[];
}): CierreDiarioComputed[] {
  const { desde, hasta, cierres, gastos, retiros, nequi } = args;

  // Mapa fecha -> cierre
  const cierreByFecha = new Map<string, CierreInput>();
  for (const c of cierres) {
    cierreByFecha.set(startOfDay(c.fecha).toISOString(), c);
  }

  // Construir el conjunto de días a iterar: unión de días con cierre + días
  // con cualquier movimiento (gasto, retiro o nequi recibido).
  const dayKeys = new Set<string>();
  for (const c of cierres) dayKeys.add(startOfDay(c.fecha).toISOString());
  for (const g of gastos) {
    const t = startOfDay(g.fecha).getTime();
    if (t >= startOfDay(desde).getTime() && t <= startOfDay(hasta).getTime()) {
      dayKeys.add(startOfDay(g.fecha).toISOString());
    }
  }
  for (const r of retiros) {
    const t = startOfDay(r.fecha).getTime();
    if (t >= startOfDay(desde).getTime() && t <= startOfDay(hasta).getTime()) {
      dayKeys.add(startOfDay(r.fecha).toISOString());
    }
  }
  for (const n of nequi) {
    const t = startOfDay(n.fecha).getTime();
    if (t >= startOfDay(desde).getTime() && t <= startOfDay(hasta).getTime()) {
      dayKeys.add(startOfDay(n.fecha).toISOString());
    }
  }

  const sortedDays = [...dayKeys]
    .map((k) => new Date(k))
    .sort((a, b) => a.getTime() - b.getTime());

  let prevEfec = 0;
  let prevNequi = 0;
  const result: CierreDiarioComputed[] = [];

  for (const day of sortedDays) {
    const dayStart = startOfDay(day).getTime();

    const cierre =
      cierreByFecha.get(new Date(dayStart).toISOString()) ?? {
        fecha: day,
        cajaApertura: 0,
        cajaCierre: 0,
        efectivoGuardado: 0,
        efectivoRealContado: null,
      };

    const gastosDelDia = gastos.filter(
      (g) => startOfDay(g.fecha).getTime() === dayStart,
    );
    const retirosDelDia = retiros.filter(
      (r) => startOfDay(r.fecha).getTime() === dayStart,
    );
    const nequiDelDia = nequi
      .filter((n) => startOfDay(n.fecha).getTime() === dayStart)
      .reduce((s, n) => s + n.total, 0);

    const computed = computeCierreDiario({
      cierre,
      gastosDelDia,
      retirosDelDia,
      nequiDelDia,
      prevEfectivoAcumulado: prevEfec,
      prevNequiAcumulado: prevNequi,
    });

    result.push(computed);
    prevEfec = computed.efectivoAcumulado;
    prevNequi = computed.nequiAcumulado;
  }

  return result;
}

/**
 * Resumen del balance general para el periodo solicitado.
 */
export function balanceGeneral(args: {
  desde: Date;
  hasta: Date;
  cierres: CierreInput[];
  gastos: GastoForCalc[];
  retiros: RetiroForCalc[];
  nequi: NequiForCalc[];
}): BalanceGeneral {
  const serie = serieCierres(args);
  const ultimo = serie[serie.length - 1];

  // Para el periodo: filtramos los arrays por fecha en el rango.
  const t0 = startOfDay(args.desde).getTime();
  const t1 = startOfDay(args.hasta).getTime();
  const inRange = (d: Date) => {
    const t = startOfDay(d).getTime();
    return t >= t0 && t <= t1;
  };
  const gastosPeriodo = args.gastos.filter((g) => inRange(g.fecha));
  const retirosPeriodo = args.retiros.filter((r) => inRange(r.fecha));
  const nequiPeriodo = args.nequi.filter((n) => inRange(n.fecha));

  const gastosCaja = sumBy(gastosPeriodo, (g) => g.pagadoCon === "CAJA", (g) => g.valor);
  const gastosEfectivo = sumBy(
    gastosPeriodo,
    (g) => g.pagadoCon === "EFECTIVO",
    (g) => g.valor,
  );
  const retirosEfectivo = sumBy(
    retirosPeriodo,
    (r) => r.saleDe === "EFECTIVO",
    (r) => r.valor,
  );
  const retirosNequi = sumBy(
    retirosPeriodo,
    (r) => r.saleDe === "NEQUI",
    (r) => r.valor,
  );
  const retirosCaja = sumBy(
    retirosPeriodo,
    (r) => r.saleDe === "CAJA",
    (r) => r.valor,
  );

  const efectivoGuardadoPeriodo = serie.reduce(
    (s, c) => s + c.efectivoGuardado,
    0,
  );
  const nequiRecibidoPeriodo = nequiPeriodo.reduce((s, n) => s + n.total, 0);

  // Saldos al final del periodo: usamos el acumulado del último día con datos,
  // NO los del periodo filtrado (para que reflejen TODO el histórico).
  const serieCompleta = serieCierres({
    desde: serie[0]?.fecha ?? args.desde,
    hasta: serie[serie.length - 1]?.fecha ?? args.hasta,
    cierres: args.cierres,
    gastos: args.gastos,
    retiros: args.retiros,
    nequi: args.nequi,
  });
  const ultimoCompleto = serieCompleta[serieCompleta.length - 1];

  const saldoEfectivoActual = ultimoCompleto?.efectivoAcumulado ?? 0;
  const saldoNequiActual = ultimoCompleto?.nequiAcumulado ?? 0;

  const ultimoCajaCierre = ultimo?.cajaCierre ?? 0;
  const efectivoRealUltimoConteo = (() => {
    for (let i = serie.length - 1; i >= 0; i--) {
      if (serie[i].efectivoRealContado != null) return serie[i].efectivoRealContado;
    }
    return null;
  })();

  const puntoMasBajoEfecto = serie.reduce(
    (min, c) => Math.min(min, c.efectivoAcumulado),
    Number.POSITIVE_INFINITY,
  );
  const diasConDescuadre = serie.filter((c) => c.descuadre != null && c.descuadre !== 0).length;

  return {
    desde: args.desde,
    hasta: args.hasta,
    gastosCaja,
    gastosEfectivo,
    totalGastos: gastosCaja + gastosEfectivo,
    retirosEfectivo,
    retirosNequi,
    retirosCaja,
    totalRetiros: retirosEfectivo + retirosNequi + retirosCaja,
    efectivoGuardadoPeriodo,
    efectivoRealUltimoConteo,
    ultimoCajaCierre,
    saldoEfectivoActual,
    nequiRecibidoPeriodo,
    saldoNequiActual,
    totalDisponible: saldoEfectivoActual + saldoNequiActual,
    puntoMasBajoEfectivo:
      puntoMasBajoEfecto === Number.POSITIVE_INFINITY ? 0 : puntoMasBajoEfecto,
    diasConDescuadre,
  };
}

/**
 * Ranking de proveedores por gasto total en el periodo.
 */
export function rankingProveedores(
  gastos: GastoForCalc[],
  topN = 10,
): RankingProveedor[] {
  const map = new Map<string, number>();
  for (const g of gastos) {
    map.set(g.proveedor, (map.get(g.proveedor) ?? 0) + g.valor);
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  return [...map.entries()]
    .map(([proveedor, t]) => ({
      proveedor,
      total: t,
      porcentaje: total === 0 ? 0 : t / total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);
}

/**
 * Re-export para utilidad.
 */
export { sameDay };
