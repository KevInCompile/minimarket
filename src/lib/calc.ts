/**
 * Motor de cálculo de minimarket.
 *
 * Reglas de negocio (copiadas del Excel Control_Caja):
 *
 * - Gastos con pagadoCon=CAJA salen de la plata que entra durante el día
 *   (no tocan el efectivo guardado).
 * - Gastos con pagadoCon=EFECTIVO salen del efectivo guardado acumulado.
 * - Gastos con pagadoCon=TRANSFERENCIA salen del saldo de Transferencia
 *   acumulado (no tocan el efectivo del día ni el guardado).
 * - Retiros con saleDe=EFECTIVO salen del efectivo guardado acumulado.
 * - Retiros con saleDe=NEQUI salen del saldo Transferencia acumulado.
 * - El efectivo guardado nunca queda en negativo (chequeo del Excel).
 * - La entrada estimada del día = (caja cierre - caja apertura) + gastos de caja.
 * - El descuadre = efectivo real contado - efectivo acumulado (solo si hay conteo).
 */

import type { PagadoCon, SaleDe } from "@prisma/client";
import { startOfDayUTC, endOfDayUTC, mesKey } from "./dates";

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

export type TransferenciaForCalc = {
  fecha: Date;
  total: number;
};

export type CierreDiarioComputed = CierreInput & {
  gastosCaja: number;
  gastosEfectivo: number;
  gastosTransferencia: number;
  totalGastos: number;
  retirosEfectivo: number;
  retirosTransferencia: number;
  retirosCaja: number;
  entradaEstimada: number;
  efectivoAcumulado: number;
  transferenciaAcumulado: number;
  transferenciaDia: number;
  descuadre: number | null;
  /**
   * Total "venta" del día: efectivo guardado + retiros del día (efectivo) +
   * gastos del día pagados con caja. Es una estimación de la plata que se
   * movió del negocio en el día.
   */
  totalVentaDelDia: number;
};

export type BalanceGeneral = {
  desde: Date;
  hasta: Date;
  gastosCaja: number;
  gastosEfectivo: number;
  gastosTransferencia: number;
  totalGastos: number;
  retirosEfectivo: number;
  retirosTransferencia: number;
  retirosCaja: number;
  totalRetiros: number;
  efectivoGuardadoPeriodo: number;
  efectivoRealUltimoConteo: number | null;
  ultimoCajaCierre: number;
  // Los saldos actuales reflejan el estado al final del periodo, usando
  // el ciclo completo desde el primer día con datos.
  saldoEfectivoActual: number;
  transferenciaRecibidoPeriodo: number;
  saldoTransferenciaActual: number;
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

function endOfDay(d: Date): Date {
  return endOfDayUTC(d);
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
  transferenciaDia: number;
  prevEfectivoAcumulado: number;
  prevTransferenciaAcumulado: number;
}): CierreDiarioComputed {
  const { cierre, gastosDelDia, retirosDelDia, transferenciaDia } = args;

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
  const gastosTransferencia = sumBy(
    gastosDelDia,
    (g) => g.pagadoCon === "TRANSFERENCIA",
    (g) => g.valor,
  );
  const retirosEfectivo = sumBy(
    retirosDelDia,
    (r) => r.saleDe === "EFECTIVO",
    (r) => r.valor,
  );
  const retirosTransferencia = sumBy(
    retirosDelDia,
    (r) => r.saleDe === "TRANSFERENCIA",
    (r) => r.valor,
  );
  const retirosCaja = sumBy(
    retirosDelDia,
    (r) => r.saleDe === "CAJA",
    (r) => r.valor,
  );

  const totalGastos = gastosCaja + gastosEfectivo + gastosTransferencia;
  const entradaEstimada =
    cierre.cajaCierre - cierre.cajaApertura + gastosCaja;

  const efectivoAcumulado =
    args.prevEfectivoAcumulado +
    cierre.efectivoGuardado -
    gastosEfectivo -
    retirosEfectivo;

  const transferenciaAcumulado =
    args.prevTransferenciaAcumulado +
    transferenciaDia -
    retirosTransferencia -
    gastosTransferencia;

  const descuadre =
    cierre.efectivoRealContado == null
      ? null
      : cierre.efectivoRealContado - efectivoAcumulado;

  // Total "venta" del día: efectivo guardado + retiros con saleDe=EFECTIVO
  // + gastos pagados con caja. Es la plata que se movió del negocio en el día.
  const totalVentaDelDia = (cierre.efectivoGuardado + gastosCaja + transferenciaDia);

  return {
    ...cierre,
    gastosCaja,
    gastosEfectivo,
    gastosTransferencia,
    totalGastos,
    retirosEfectivo,
    retirosTransferencia,
    retirosCaja,
    entradaEstimada,
    efectivoAcumulado,
    transferenciaAcumulado,
    transferenciaDia,
    descuadre,
    totalVentaDelDia,
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
  transferencia: TransferenciaForCalc[];
}): CierreDiarioComputed[] {
  const { desde, hasta, cierres, gastos, retiros, transferencia } = args;

  // Mapa fecha -> cierre
  const cierreByFecha = new Map<string, CierreInput>();
  for (const c of cierres) {
    cierreByFecha.set(startOfDay(c.fecha).toISOString(), c);
  }

  // Construir el conjunto de días a iterar: unión de días con cierre + días
  // con cualquier movimiento (gasto, retiro o transferencia recibido).
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
  for (const n of transferencia) {
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
    const transferenciaDia = transferencia
      .filter((n) => startOfDay(n.fecha).getTime() === dayStart)
      .reduce((s, n) => s + n.total, 0);

    const computed = computeCierreDiario({
      cierre,
      gastosDelDia,
      retirosDelDia,
      transferenciaDia,
      prevEfectivoAcumulado: prevEfec,
      prevTransferenciaAcumulado: prevNequi,
    });

    result.push(computed);
    prevEfec = computed.efectivoAcumulado;
    prevNequi = computed.transferenciaAcumulado;
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
  transferencia: TransferenciaForCalc[];
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
  const transferenciaPeriodo = args.transferencia.filter((n) => inRange(n.fecha));

  const gastosCaja = sumBy(gastosPeriodo, (g) => g.pagadoCon === "CAJA", (g) => g.valor);
  const gastosEfectivo = sumBy(
    gastosPeriodo,
    (g) => g.pagadoCon === "EFECTIVO",
    (g) => g.valor,
  );
  const gastosTransferencia = sumBy(
    gastosPeriodo,
    (g) => g.pagadoCon === "TRANSFERENCIA",
    (g) => g.valor,
  );
  const retirosEfectivo = sumBy(
    retirosPeriodo,
    (r) => r.saleDe === "EFECTIVO",
    (r) => r.valor,
  );
  const retirosTransferencia = sumBy(
    retirosPeriodo,
    (r) => r.saleDe === "TRANSFERENCIA",
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
  const transferenciaRecibidoPeriodo = transferenciaPeriodo.reduce((s, n) => s + n.total, 0);

  // Saldos al final del periodo: usamos el acumulado del último día con datos,
  // NO los del periodo filtrado (para que reflejen TODO el histórico).
  const serieCompleta = serieCierres({
    desde: serie[0]?.fecha ?? args.desde,
    hasta: serie[serie.length - 1]?.fecha ?? args.hasta,
    cierres: args.cierres,
    gastos: args.gastos,
    retiros: args.retiros,
    transferencia: args.transferencia,
  });
  const ultimoCompleto = serieCompleta[serieCompleta.length - 1];

  const saldoEfectivoActual = ultimoCompleto?.efectivoAcumulado ?? 0;
  const saldoTransferenciaActual = ultimoCompleto?.transferenciaAcumulado ?? 0;

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
    gastosTransferencia,
    totalGastos: gastosCaja + gastosEfectivo + gastosTransferencia,
    retirosEfectivo,
    retirosTransferencia,
    retirosCaja,
    totalRetiros: retirosEfectivo + retirosTransferencia + retirosCaja,
    efectivoGuardadoPeriodo,
    efectivoRealUltimoConteo,
    ultimoCajaCierre,
    saldoEfectivoActual,
    transferenciaRecibidoPeriodo,
    saldoTransferenciaActual,
    totalDisponible: saldoEfectivoActual + saldoTransferenciaActual,
    puntoMasBajoEfectivo:
      puntoMasBajoEfecto === Number.POSITIVE_INFINITY ? 0 : puntoMasBajoEfecto,
    diasConDescuadre,
  };
}

/**
 * Immediately preceding window with the same length in days, ending the day
 * before `desde`. Both bounds are UTC: `desde` is the start of the first day
 * and `hasta` is the end of the last day, so the result can be compared with a
 * DB range filter without losing same-day rows.
 */
export function previousPeriodRange(
  desde: Date,
  hasta: Date,
): { desde: Date; hasta: Date } {
  const inicioActual = startOfDay(desde).getTime();
  const finActual = startOfDay(hasta).getTime();
  const MS_PER_DAY = 86_400_000;

  const dias = Math.floor((finActual - inicioActual) / MS_PER_DAY) + 1;
  const finAnterior = new Date(inicioActual - MS_PER_DAY);
  const inicioAnterior = new Date(finAnterior.getTime() - (dias - 1) * MS_PER_DAY);

  return {
    desde: startOfDay(inicioAnterior),
    hasta: endOfDay(finAnterior),
  };
}

export type MetricaTendencia = {
  valor: number;
  anterior: number;
  delta: number;
  pct: number | null; // delta/anterior*100, null when anterior === 0
  direccion: "sube" | "baja" | "igual";
};

function tendencia(actual: number, anterior: number): MetricaTendencia {
  const delta = actual - anterior;
  return {
    valor: actual,
    anterior,
    delta,
    pct: anterior === 0 ? null : (delta / anterior) * 100,
    direccion: delta === 0 ? "igual" : delta > 0 ? "sube" : "baja",
  };
}

/**
 * Period-over-period comparison of the period-scoped flows.
 *
 * Only flows are comparable: `totalGastos`, `totalRetiros`,
 * `transferenciaRecibidoPeriodo` and `efectivoGuardadoPeriodo` accumulate
 * within the given range. The balance fields (`totalDisponible`,
 * `saldoEfectivoActual`, `saldoTransferenciaActual`) restart from zero on every
 * call, so comparing them across periods would be misleading — that is why
 * they are deliberately absent here.
 */
export function compararFlujos(actual: BalanceGeneral, anterior: BalanceGeneral): {
  gastos: MetricaTendencia;
  retiros: MetricaTendencia;
  transferenciaRecibido: MetricaTendencia;
  efectivoGuardado: MetricaTendencia;
} {
  return {
    gastos: tendencia(actual.totalGastos, anterior.totalGastos),
    retiros: tendencia(actual.totalRetiros, anterior.totalRetiros),
    transferenciaRecibido: tendencia(
      actual.transferenciaRecibidoPeriodo,
      anterior.transferenciaRecibidoPeriodo,
    ),
    efectivoGuardado: tendencia(
      actual.efectivoGuardadoPeriodo,
      anterior.efectivoGuardadoPeriodo,
    ),
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
 * Punto de una serie mensual: clave 'YYYY-MM', etiqueta corta en español
 * ("ene", "feb", …) y el total del mes.
 */
export type PuntoMes = { key: string; label: string; total: number };

/** Métricas de flujo que las tarjetas KPI del dashboard resumen por mes. */
export type MetricaMensual =
  | "totalVenta"
  | "efectivoGuardado"
  | "gastos"
  | "transferenciaRecibido";

export type SerieMensualArgs = {
  desde: Date;
  hasta: Date;
  cierres: CierreInput[];
  gastos: GastoForCalc[];
  retiros: RetiroForCalc[];
  transferencia: TransferenciaForCalc[];
};

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

type MesDelRango = { key: string; label: string; anio: number; mes: number };

/**
 * Meses de calendario que cubre el rango [desde, hasta], en orden ascendente.
 * Si `hasta` es anterior a `desde` colapsa al mes de `desde` (en vez de
 * devolver una lista vacía o infinita).
 */
function mesesDelRango(desde: Date, hasta: Date): MesDelRango[] {
  const inicio = startOfDay(desde);
  const finBruto = startOfDay(hasta);
  const fin = finBruto.getTime() < inicio.getTime() ? inicio : finBruto;

  const meses: MesDelRango[] = [];
  let anio = inicio.getUTCFullYear();
  let mes = inicio.getUTCMonth();

  for (;;) {
    meses.push({
      key: `${anio}-${String(mes + 1).padStart(2, "0")}`,
      label: MESES_CORTOS[mes],
      anio,
      mes,
    });
    if (anio === fin.getUTCFullYear() && mes === fin.getUTCMonth()) return meses;
    mes += 1;
    if (mes > 11) {
      mes = 0;
      anio += 1;
    }
  }
}

const VALOR_POR_METRICA: Record<
  MetricaMensual,
  (c: CierreDiarioComputed) => number
> = {
  totalVenta: (c) => c.totalVentaDelDia,
  efectivoGuardado: (c) => c.efectivoGuardado,
  gastos: (c) => c.totalGastos,
  transferenciaRecibido: (c) => c.transferenciaDia,
};

/**
 * Recorta los movimientos a la ventana pedida.
 *
 * `serieCierres()` agrega los días de `cierres` sin filtrar por rango, así que
 * un cierre anterior al `desde` entraría en la serie y —peor— contaminaría los
 * acumulados de todo lo que viene después. Las series mensuales se acotan
 * siempre a su propia ventana.
 */
function movementsEnRango<T extends { fecha: Date }>(
  items: T[],
  desde: Date,
  hasta: Date,
): T[] {
  const t0 = startOfDay(desde).getTime();
  const t1 = startOfDay(hasta).getTime();
  return items.filter((i) => {
    const t = startOfDay(i.fecha).getTime();
    return t >= t0 && t <= t1;
  });
}

function serieMensualAcotada(args: SerieMensualArgs): SerieMensualArgs {
  return {
    desde: args.desde,
    hasta: args.hasta,
    cierres: movementsEnRango(args.cierres, args.desde, args.hasta),
    gastos: movementsEnRango(args.gastos, args.desde, args.hasta),
    retiros: movementsEnRango(args.retiros, args.desde, args.hasta),
    transferencia: movementsEnRango(args.transferencia, args.desde, args.hasta),
  };
}

/**
 * Serie mensual de una métrica de flujo: un punto por mes del rango.
 *
 * Todas las métricas comparten las mismas claves de mes (salen de
 * `mesesDelRango`), así que las tarjetas KPI y el gráfico de evolución pueden
 * alinearse en el mismo eje X.
 */
export function serieMensualMetrica(
  args: SerieMensualArgs,
  metrica: MetricaMensual,
): PuntoMes[] {
  const acotada = serieMensualAcotada(args);
  const meses = mesesDelRango(acotada.desde, acotada.hasta);
  const totalPorMes = new Map<string, number>(meses.map((m) => [m.key, 0]));
  const valor = VALOR_POR_METRICA[metrica];

  for (const dia of serieCierres(acotada)) {
    // Cinturón de seguridad: un mes que no está en el pedido se descarta.
    const key = mesKey(dia.fecha);
    if (!totalPorMes.has(key)) continue;
    totalPorMes.set(key, (totalPorMes.get(key) ?? 0) + valor(dia));
  }

  return meses.map((m) => ({
    key: m.key,
    label: m.label,
    total: totalPorMes.get(m.key) ?? 0,
  }));
}

/**
 * Serie mensual del "total venta" (efectivo guardado + gastos de caja +
 * transferencia recibida), la misma métrica de `totalVentaDelDia`.
 */
export function serieMensual(args: SerieMensualArgs): PuntoMes[] {
  return serieMensualMetrica(args, "totalVenta");
}

/**
 * Serie mensual del saldo total disponible (efectivo acumulado +
 * Transferencia acumulada) al cierre de cada mes.
 *
 * A diferencia de las métricas de flujo, el saldo sí es acumulativo: para cada
 * mes se corre la serie hasta el último día de ese mes y se toma el acumulado
 * del último día con datos. Por eso `serieCierres()` reinicia los acumulados en
 * cada llamada — el valor de un mes NO es comparable con el saldo del mismo
 * mes calculado sobre otra ventana.
 */
export function serieMensualSaldo(args: SerieMensualArgs): PuntoMes[] {
  const acotada = serieMensualAcotada(args);

  return mesesDelRango(acotada.desde, acotada.hasta).map((m) => {
    const finDelMes = new Date(
      Date.UTC(m.anio, m.mes + 1, 0, 23, 59, 59, 999),
    );
    const ultimo = serieCierres({ ...acotada, hasta: finDelMes })
      .filter((c) => mesKey(c.fecha) === m.key)
      .at(-1);
    return {
      key: m.key,
      label: m.label,
      total:
        (ultimo?.efectivoAcumulado ?? 0) +
        (ultimo?.transferenciaAcumulado ?? 0),
    };
  });
}

/**
 * Re-export para utilidad.
 */
export { sameDay };
