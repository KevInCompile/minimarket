import { describe, it, expect } from "vitest";
import {
  computeCierreDiario,
  serieCierres,
  balanceGeneral,
  rankingProveedores,
  previousPeriodRange,
  compararFlujos,
  serieMensual,
  serieMensualMetrica,
  serieMensualSaldo,
  type BalanceGeneral,
  type CierreInput,
  type GastoForCalc,
  type MetricaMensual,
  type RetiroForCalc,
  type TransferenciaForCalc,
} from "../src/lib/calc";
import { excelSerialToDate } from "../src/lib/dates";

/**
 * Tests de paridad contra el Excel Control_Caja_Septiembre_2026.xlsx.
 *
 * Los datos sembrados vienen de las hojas TRANSACCIONALES del Excel
 * (Gastos, Retiros, Transferencia). Esos totales NO coinciden exactamente con los
 * números hardcodeados de la hoja "Balance general" del Excel original —
 * el autor había escrito esos totales a mano y no cuadraban con las
 * transacciones. Nuestro sistema usa las transacciones como única fuente
 * de verdad, por lo que los totales pueden diferir del Excel antiguo.
 *
 * Totales transaccionales sembrados (verificables):
 *   Total gastos          2.750.878 (cuadra con la fila TOTAL de la hoja Gastos)
 *   Retiros efectivo        900.000
 *   Retiros Transferencia           300.000 (200.000 + 100.000 del sheet de retiros)
 *   Efectivo guardado     3.452.000
 *   Transferencia recibido          898.200
 *   Punto más bajo         170.527 (Lunes 14/09)
 *
 * Totales del Excel "Balance general" (NO coinciden — son manuales):
 *   Total gastos          2.908.328
 *   Retiros Transferencia           325.000
 *   Saldo efectivo actual   944.827
 *   Saldo Transferencia actual      573.200
 *   TOTAL DISPONIBLE      1.048.200
 */

const DESDE = excelSerialToDate(46267);
const HASTA = excelSerialToDate(46284);

const gastos: GastoForCalc[] = [
  // Miércoles 02/09 (46267) - solo Coca-Cola Caja
  { fecha: excelSerialToDate(46267), proveedor: "Coca-Cola", valor: 30000, pagadoCon: "CAJA" },
  // Jueves 03/09 (46268)
  { fecha: excelSerialToDate(46268), proveedor: "Agua bolsa", valor: 11500, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46268), proveedor: "Postobón", valor: 105250, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46268), proveedor: "Quala", valor: 40200, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46268), proveedor: "Colanta", valor: 34400, pagadoCon: "CAJA" },
  // Viernes 04/09 (46269)
  { fecha: excelSerialToDate(46269), proveedor: "Altipal", valor: 44300, pagadoCon: "CAJA" },
  // Sábado 05/09 (46270)
  { fecha: excelSerialToDate(46270), proveedor: "Big Cola", valor: 56250, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46270), proveedor: "Coca-Cola", valor: 70000, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46270), proveedor: "Multitoma", valor: 12800, pagadoCon: "CAJA" },
  // Lunes 07/09 (46272)
  { fecha: excelSerialToDate(46272), proveedor: "Tomas / enchufe", valor: 4000, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46272), proveedor: "Zenú", valor: 44750, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46272), proveedor: "Pan", valor: 37500, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46272), proveedor: "Agua", valor: 36800, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46272), proveedor: "Bananos", valor: 5000, pagadoCon: "CAJA" },
  // Martes 08/09 (46273)
  { fecha: excelSerialToDate(46273), proveedor: "Salchichón", valor: 7000, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46273), proveedor: "Plaza", valor: 125250, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46273), proveedor: "Queso", valor: 99300, pagadoCon: "EFECTIVO" },
  // Miércoles 09/09 (46274)
  { fecha: excelSerialToDate(46274), proveedor: "Colombina", valor: 31850, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46274), proveedor: "Big Cola", valor: 69400, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46274), proveedor: "Coca-Cola", valor: 189200, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46274), proveedor: "Cigarrillos", valor: 60500, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46274), proveedor: "Margarita", valor: 177723, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46274), proveedor: "Centan", valor: 41000, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46274), proveedor: "Pan", valor: 20000, pagadoCon: "CAJA" },
  // Jueves 10/09 (46275)
  { fecha: excelSerialToDate(46275), proveedor: "Huevos", valor: 36000, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46275), proveedor: "Huevos", valor: 20000, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46275), proveedor: "Tostadas", valor: 21000, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46275), proveedor: "Arepas", valor: 51000, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46275), proveedor: "Suárez", valor: 49900, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46275), proveedor: "Espátula", valor: 5000, pagadoCon: "EFECTIVO" },
  // Viernes 11/09 (46276)
  { fecha: excelSerialToDate(46276), proveedor: "Huevos", valor: 56000, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46276), proveedor: "Alquería", valor: 43600, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46276), proveedor: "Ramo", valor: 64750, pagadoCon: "EFECTIVO" },
  // Sábado 12/09 (46277)
  { fecha: excelSerialToDate(46277), proveedor: "Coca-Cola", valor: 178750, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46277), proveedor: "Colanta", valor: 16299, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46277), proveedor: "Doris", valor: 26600, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46277), proveedor: "Ceneca", valor: 33850, pagadoCon: "CAJA" },
  // Domingo 13/09 (46278)
  { fecha: excelSerialToDate(46278), proveedor: "Jugos", valor: 28000, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46278), proveedor: "Plaza", valor: 30000, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46278), proveedor: "Tomate", valor: 5000, pagadoCon: "CAJA" },
  // Martes 15/09 (46280)
  { fecha: excelSerialToDate(46280), proveedor: "Pan", valor: 24000, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46280), proveedor: "Papel", valor: 33400, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46280), proveedor: "Colanta", valor: 34400, pagadoCon: "CAJA" },
  // Miércoles 16/09 (46281)
  { fecha: excelSerialToDate(46281), proveedor: "Coca-Cola", valor: 145200, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46281), proveedor: "Pan", valor: 24000, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46281), proveedor: "Arepas", valor: 20000, pagadoCon: "CAJA" },
  // Jueves 17/09 (46282)
  { fecha: excelSerialToDate(46282), proveedor: "Diana", valor: 42000, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46282), proveedor: "Diana", valor: 17100, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46282), proveedor: "Postobón", valor: 55000, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46282), proveedor: "Agua", valor: 36800, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46282), proveedor: "Cigarrillos", valor: 107000, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46282), proveedor: "Colanta", valor: 25500, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46282), proveedor: "Plaza", valor: 53000, pagadoCon: "EFECTIVO" },
  { fecha: excelSerialToDate(46282), proveedor: "Quesos y Arepas", valor: 71006, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46282), proveedor: "Suárez", valor: 31750, pagadoCon: "CAJA" },
  { fecha: excelSerialToDate(46282), proveedor: "Pan Albania", valor: 11000, pagadoCon: "CAJA" },
];

const retiros: RetiroForCalc[] = [
  // Lunes 14/09 (46279)
  { fecha: excelSerialToDate(46279), concepto: "Arriendo", valor: 900000, saleDe: "EFECTIVO" },
  // Jueves 17/09 (46282)
  { fecha: excelSerialToDate(46282), concepto: "Nómina", valor: 200000, saleDe: "TRANSFERENCIA" },
  // Viernes 18/09 (46283)
  { fecha: excelSerialToDate(46283), concepto: "Nómina y pedido", valor: 100000, saleDe: "TRANSFERENCIA" },
];

const transferencia: TransferenciaForCalc[] = [
  { fecha: excelSerialToDate(46269), total: 44000 },
  { fecha: excelSerialToDate(46272), total: 59000 },
  { fecha: excelSerialToDate(46273), total: 39400 },
  { fecha: excelSerialToDate(46274), total: 40000 },
  { fecha: excelSerialToDate(46275), total: 52000 },
  { fecha: excelSerialToDate(46276), total: 70800 },
  { fecha: excelSerialToDate(46277), total: 25500 },
  { fecha: excelSerialToDate(46278), total: 48500 },
  { fecha: excelSerialToDate(46280), total: 107000 },
  { fecha: excelSerialToDate(46281), total: 44400 },
  { fecha: excelSerialToDate(46282), total: 94000 },
  { fecha: excelSerialToDate(46283), total: 135000 },
  { fecha: excelSerialToDate(46284), total: 138600 },
];

const cierres: CierreInput[] = [
  // Miércoles 02/09 - caja apertura vacía, cierre 108000, guardado 210000
  { fecha: excelSerialToDate(46267), cajaApertura: 0, cajaCierre: 108000, efectivoGuardado: 210000, efectivoRealContado: null },
  // Jueves 03/09
  { fecha: excelSerialToDate(46268), cajaApertura: 108000, cajaCierre: 108000, efectivoGuardado: 0, efectivoRealContado: null },
  // Viernes 04/09
  { fecha: excelSerialToDate(46269), cajaApertura: 108000, cajaCierre: 108000, efectivoGuardado: 150000, efectivoRealContado: null },
  // Sábado 05/09
  { fecha: excelSerialToDate(46270), cajaApertura: 108000, cajaCierre: 62000, efectivoGuardado: 220000, efectivoRealContado: null },
  // Domingo 06/09
  { fecha: excelSerialToDate(46271), cajaApertura: 62000, cajaCierre: 50000, efectivoGuardado: 180000, efectivoRealContado: null },
  // Lunes 07/09
  { fecha: excelSerialToDate(46272), cajaApertura: 50000, cajaCierre: 50000, efectivoGuardado: 180000, efectivoRealContado: null },
  // Martes 08/09
  { fecha: excelSerialToDate(46273), cajaApertura: 50000, cajaCierre: 50000, efectivoGuardado: 160000, efectivoRealContado: null },
  // Miércoles 09/09
  { fecha: excelSerialToDate(46274), cajaApertura: 50000, cajaCierre: 52500, efectivoGuardado: 383000, efectivoRealContado: null },
  // Jueves 10/09
  { fecha: excelSerialToDate(46275), cajaApertura: 52500, cajaCierre: 64300, efectivoGuardado: 295000, efectivoRealContado: null },
  // Viernes 11/09
  { fecha: excelSerialToDate(46276), cajaApertura: 64300, cajaCierre: 176100, efectivoGuardado: 0, efectivoRealContado: null },
  // Sábado 12/09
  { fecha: excelSerialToDate(46277), cajaApertura: 176100, cajaCierre: 62000, efectivoGuardado: 125000, efectivoRealContado: null },
  // Domingo 13/09
  { fecha: excelSerialToDate(46278), cajaApertura: 62000, cajaCierre: 58000, efectivoGuardado: 340000, efectivoRealContado: null },
  // Lunes 14/09
  { fecha: excelSerialToDate(46279), cajaApertura: 58000, cajaCierre: 0, efectivoGuardado: 0, efectivoRealContado: null },
  // Martes 15/09
  { fecha: excelSerialToDate(46280), cajaApertura: 58000, cajaCierre: 48500, efectivoGuardado: 220000, efectivoRealContado: null },
  // Miércoles 16/09
  { fecha: excelSerialToDate(46281), cajaApertura: 48500, cajaCierre: 55000, efectivoGuardado: 301000, efectivoRealContado: null },
  // Jueves 17/09
  { fecha: excelSerialToDate(46282), cajaApertura: 55000, cajaCierre: 44000, efectivoGuardado: 160000, efectivoRealContado: 438000 },
  // Viernes 18/09
  { fecha: excelSerialToDate(46283), cajaApertura: 44000, cajaCierre: 50000, efectivoGuardado: 258000, efectivoRealContado: null },
  // Sábado 19/09
  { fecha: excelSerialToDate(46284), cajaApertura: 44000, cajaCierre: 53000, efectivoGuardado: 270000, efectivoRealContado: null },
];

describe("calc - serieCierres", () => {
  it("reproduce el efectivo acumulado del Excel día por día", () => {
    const serie = serieCierres({
      desde: DESDE,
      hasta: HASTA,
      cierres,
      gastos,
      retiros,
      transferencia,
    });

    const find = (serial: number) =>
      serie.find((s) => s.fecha.getTime() === excelSerialToDate(serial).getTime());

    // Miércoles 02/09: 0 + 210000 - 0 (Coca-Cola es Caja) - 0 = 210000
    // (El Excel original muestra 180000 pero asume que Coca-Cola fue Efectivo;
    // sembramos según la hoja Gastos, donde es Caja.)
    expect(find(46267)?.efectivoAcumulado).toBe(210000);
    // Jueves 03/09: 210000 + 0 - 0 - 0 = 210000
    expect(find(46268)?.efectivoAcumulado).toBe(210000);
    // Viernes 04/09: 210000 + 150000 - 0 - 0 = 360000
    expect(find(46269)?.efectivoAcumulado).toBe(360000);
    // Sábado 05/09: 360000 + 220000 - 0 - 0 = 580000
    expect(find(46270)?.efectivoAcumulado).toBe(580000);
    // Domingo 06/09: 580000 + 180000 - 0 - 0 = 760000
    expect(find(46271)?.efectivoAcumulado).toBe(760000);
    // Lunes 07/09: 760000 + 180000 - 85550 - 0 = 854450
    expect(find(46272)?.efectivoAcumulado).toBe(854450);
    // Martes 08/09: 854450 + 160000 - 224550 - 0 = 789900
    expect(find(46273)?.efectivoAcumulado).toBe(789900);
    // Miércoles 09/09: 789900 + 383000 - 569673 - 0 = 603227
    expect(find(46274)?.efectivoAcumulado).toBe(603227);
    // Jueves 10/09: 603227 + 295000 - 113000 - 0 = 785227
    expect(find(46275)?.efectivoAcumulado).toBe(785227);
    // Viernes 11/09: 785227 + 0 - 64750 - 0 = 720477
    expect(find(46276)?.efectivoAcumulado).toBe(720477);
    // Sábado 12/09: 720477 + 125000 - 0 - 0 = 845477
    expect(find(46277)?.efectivoAcumulado).toBe(845477);
    // Domingo 13/09: 845477 + 340000 - 0 - 0 = 1185477
    expect(find(46278)?.efectivoAcumulado).toBe(1185477);
    // Lunes 14/09: 1185477 + 0 - 0 - 900000 = 285477  ← PUNTO MÁS BAJO (no 170527, ver comentario arriba)
    expect(find(46279)?.efectivoAcumulado).toBe(285477);
    // Martes 15/09: 285477 + 220000 - 33400 - 0 = 472077
    expect(find(46280)?.efectivoAcumulado).toBe(472077);
    // Miércoles 16/09: 472077 + 301000 - 169200 - 0 = 603877
    expect(find(46281)?.efectivoAcumulado).toBe(603877);
    // Jueves 17/09: 603877 + 160000 - 232100 - 0 = 531777
    expect(find(46282)?.efectivoAcumulado).toBe(531777);
  });
});

describe("calc - balanceGeneral", () => {
  it("reproduce los totales del Excel 'Balance general'", () => {
    const bg = balanceGeneral({
      desde: DESDE,
      hasta: HASTA,
      cierres,
      gastos,
      retiros,
      transferencia,
    });

    // Totales de gastos (desde la hoja transaccional Gastos del Excel)
    expect(bg.gastosCaja).toBe(1258655);
    expect(bg.gastosEfectivo).toBe(1492223);
    expect(bg.gastosTransferencia).toBe(0);
    expect(bg.totalGastos).toBe(2750878);

    // Retiros
    expect(bg.retirosEfectivo).toBe(900000);
    expect(bg.retirosTransferencia).toBe(300000); // 200000 + 100000 del sheet de retiros
    expect(bg.totalRetiros).toBe(1200000);

    // Efectivo guardado periodo
    expect(bg.efectivoGuardadoPeriodo).toBe(3452000);

    // Transferencia
    expect(bg.transferenciaRecibidoPeriodo).toBe(898200);

    // Punto más bajo: Miércoles 02/09 = 210000 (calculado sobre transacciones reales;
    // el Excel mostraba 170527 porque arrastraba los errores manuales)
    expect(bg.puntoMasBajoEfectivo).toBe(210000);
  });

  it("último cierre de caja = cajaCierre del último día con cierre", () => {
    const bg = balanceGeneral({
      desde: DESDE,
      hasta: HASTA,
      cierres,
      gastos,
      retiros,
      transferencia,
    });
    expect(bg.ultimoCajaCierre).toBe(53000); // Sáb 19/09
  });
});

describe("calc - rankingProveedores", () => {
  it("reproduce el ranking del Excel 'Balance general'", () => {
    const ranking = rankingProveedores(gastos);

    // Top 1: Coca-Cola (30000 + 70000 + 178750 + 189200 + 145200 = 613150)
    expect(ranking[0].proveedor).toBe("Coca-Cola");
    expect(ranking[0].total).toBe(613150);

    // Top 2: Plaza (125250 + 30000 + 53000 = 208250)
    expect(ranking[1].proveedor).toBe("Plaza");
    expect(ranking[1].total).toBe(208250);

    // Top 3: Margarita (177723)
    expect(ranking[2].proveedor).toBe("Margarita");
    expect(ranking[2].total).toBe(177723);
  });
});

describe("calc - descuadre", () => {
  it("detecta descuadre del Jueves 17/09 cuando se cuenta el efectivo real", () => {
    const serie = serieCierres({
      desde: excelSerialToDate(46267),
      hasta: excelSerialToDate(46284),
      cierres,
      gastos,
      retiros,
      transferencia,
    });
    const jueves = serie.find(
      (s) => s.fecha.getTime() === excelSerialToDate(46282).getTime(),
    );
    // EfectivoAcumulado al jueves 17/09 = 531777 (según transacciones)
    // efectivoRealContado = 438000
    // descuadre = 438000 - 531777 = -93777 (negativo = sobrante en libros vs conteo real)
    expect(jueves?.descuadre).toBe(-93777);
  });
});

describe("computeCierreDiario", () => {
  it("computa correctamente un cierre con gastos y retiros", () => {
    const c = computeCierreDiario({
      cierre: {
        fecha: excelSerialToDate(46275),
        cajaApertura: 52500,
        cajaCierre: 64300,
        efectivoGuardado: 295000,
        efectivoRealContado: null,
      },
      gastosDelDia: [
        { fecha: excelSerialToDate(46275), proveedor: "A", valor: 69900, pagadoCon: "CAJA" },
        { fecha: excelSerialToDate(46275), proveedor: "B", valor: 113000, pagadoCon: "EFECTIVO" },
      ],
      retirosDelDia: [],
      transferenciaDia: 52000,
      prevEfectivoAcumulado: 423227,
      prevTransferenciaAcumulado: 182400,
    });

    expect(c.gastosCaja).toBe(69900);
    expect(c.gastosEfectivo).toBe(113000);
    expect(c.gastosTransferencia).toBe(0);
    expect(c.totalGastos).toBe(182900);
    expect(c.entradaEstimada).toBe(64300 - 52500 + 69900);
    expect(c.efectivoAcumulado).toBe(423227 + 295000 - 113000 - 0);
    expect(c.transferenciaAcumulado).toBe(182400 + 52000 - 0);
  });

  it("gasto con pagadoCon=TRANSFERENCIA se resta del saldo de transferencia y suma a totalGastos", () => {
    const c = computeCierreDiario({
      cierre: {
        fecha: excelSerialToDate(46275),
        cajaApertura: 0,
        cajaCierre: 0,
        efectivoGuardado: 0,
        efectivoRealContado: null,
      },
      gastosDelDia: [
        { fecha: excelSerialToDate(46275), proveedor: "X", valor: 50000, pagadoCon: "TRANSFERENCIA" },
      ],
      retirosDelDia: [],
      transferenciaDia: 100000,
      prevEfectivoAcumulado: 0,
      prevTransferenciaAcumulado: 200000,
    });

    expect(c.gastosCaja).toBe(0);
    expect(c.gastosEfectivo).toBe(0);
    expect(c.gastosTransferencia).toBe(50000);
    expect(c.totalGastos).toBe(50000);
    // 200000 (prev) + 100000 (recibido) - 0 (retiros) - 50000 (gasto transf) = 250000
    expect(c.transferenciaAcumulado).toBe(250000);
    // El efectivo NO se toca
    expect(c.efectivoAcumulado).toBe(0);
  });
});

describe("previousPeriodRange", () => {
  it("returns the immediately preceding window when the range crosses a month boundary", () => {
    // September 1..30 is 30 days, so the previous window is August 2..31.
    const prev = previousPeriodRange(
      new Date("2026-09-01T00:00:00.000Z"),
      new Date("2026-09-30T00:00:00.000Z"),
    );

    expect(prev.desde.toISOString()).toBe("2026-08-02T00:00:00.000Z");
    expect(prev.hasta.toISOString()).toBe("2026-08-31T23:59:59.999Z");
  });

  it("returns the immediately preceding window when the range crosses a year boundary", () => {
    // Dec 20 2025..Jan 10 2026 is 22 days, so the previous window is Nov 28..Dec 19 2025.
    const prev = previousPeriodRange(
      new Date("2025-12-20T00:00:00.000Z"),
      new Date("2026-01-10T00:00:00.000Z"),
    );

    expect(prev.desde.toISOString()).toBe("2025-11-28T00:00:00.000Z");
    expect(prev.hasta.toISOString()).toBe("2025-12-19T23:59:59.999Z");
  });

  it("returns the previous day when the range is a single day", () => {
    const prev = previousPeriodRange(
      new Date("2026-03-15T00:00:00.000Z"),
      new Date("2026-03-15T00:00:00.000Z"),
    );

    expect(prev.desde.toISOString()).toBe("2026-03-14T00:00:00.000Z");
    expect(prev.hasta.toISOString()).toBe("2026-03-14T23:59:59.999Z");
  });

  it("does not mutate the dates it receives", () => {
    const desde = new Date("2026-09-01T00:00:00.000Z");
    const hasta = new Date("2026-09-30T00:00:00.000Z");

    previousPeriodRange(desde, hasta);

    expect(desde.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(hasta.toISOString()).toBe("2026-09-30T00:00:00.000Z");
  });
});

describe("compararFlujos", () => {
  const makeBalance = (over: Partial<BalanceGeneral> = {}): BalanceGeneral => ({
    desde: new Date("2026-09-01T00:00:00.000Z"),
    hasta: new Date("2026-09-30T23:59:59.999Z"),
    gastosCaja: 0,
    gastosEfectivo: 0,
    gastosTransferencia: 0,
    totalGastos: 0,
    retirosEfectivo: 0,
    retirosTransferencia: 0,
    retirosCaja: 0,
    totalRetiros: 0,
    efectivoGuardadoPeriodo: 0,
    efectivoRealUltimoConteo: null,
    ultimoCajaCierre: 0,
    saldoEfectivoActual: 0,
    transferenciaRecibidoPeriodo: 0,
    saldoTransferenciaActual: 0,
    totalDisponible: 0,
    puntoMasBajoEfectivo: 0,
    diasConDescuadre: 0,
    ...over,
  });

  it("computes delta, pct and direction for each flow metric", () => {
    const actual = makeBalance({
      totalGastos: 120,
      totalRetiros: 50,
      transferenciaRecibidoPeriodo: 300,
      efectivoGuardadoPeriodo: 450,
    });
    const anterior = makeBalance({
      totalGastos: 100,
      totalRetiros: 100,
      transferenciaRecibidoPeriodo: 150,
      efectivoGuardadoPeriodo: 300,
    });

    const t = compararFlujos(actual, anterior);

    expect(t.gastos).toEqual({
      valor: 120,
      anterior: 100,
      delta: 20,
      pct: 20,
      direccion: "sube",
    });
    expect(t.retiros).toEqual({
      valor: 50,
      anterior: 100,
      delta: -50,
      pct: -50,
      direccion: "baja",
    });
    expect(t.transferenciaRecibido).toEqual({
      valor: 300,
      anterior: 150,
      delta: 150,
      pct: 100,
      direccion: "sube",
    });
    expect(t.efectivoGuardado).toEqual({
      valor: 450,
      anterior: 300,
      delta: 150,
      pct: 50,
      direccion: "sube",
    });
  });

  it("returns pct null when the previous period has no data", () => {
    const actual = makeBalance({
      totalGastos: 120,
      totalRetiros: 50,
      transferenciaRecibidoPeriodo: 300,
      efectivoGuardadoPeriodo: 450,
    });
    const anterior = makeBalance();

    const t = compararFlujos(actual, anterior);

    for (const m of [t.gastos, t.retiros, t.transferenciaRecibido, t.efectivoGuardado]) {
      expect(m.anterior).toBe(0);
      expect(m.pct).toBeNull();
      expect(m.direccion).toBe("sube");
    }
    expect(t.gastos.delta).toBe(120);
  });

  it("returns direction igual when both periods match", () => {
    const actual = makeBalance({
      totalGastos: 100,
      totalRetiros: 100,
      transferenciaRecibidoPeriodo: 150,
      efectivoGuardadoPeriodo: 300,
    });
    const anterior = makeBalance({
      totalGastos: 100,
      totalRetiros: 100,
      transferenciaRecibidoPeriodo: 150,
      efectivoGuardadoPeriodo: 300,
    });

    const t = compararFlujos(actual, anterior);

    for (const m of [t.gastos, t.retiros, t.transferenciaRecibido, t.efectivoGuardado]) {
      expect(m.delta).toBe(0);
      expect(m.pct).toBe(0);
      expect(m.direccion).toBe("igual");
    }
  });
});

// ---------------------------------------------------------------------------
// Serie mensual: base de los sparklines de las tarjetas KPI y del gráfico de
// evolución del dashboard. Todos los tests viven acá porque `vitest` corre en
// environment node con include tests/**/*.test.ts (sin .tsx, sin jsdom).
// ---------------------------------------------------------------------------

const D = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const cierresMensuales: CierreInput[] = [
  { fecha: D("2026-01-05"), cajaApertura: 0, cajaCierre: 0, efectivoGuardado: 100000, efectivoRealContado: null },
  { fecha: D("2026-02-10"), cajaApertura: 0, cajaCierre: 0, efectivoGuardado: 200000, efectivoRealContado: null },
  { fecha: D("2026-03-15"), cajaApertura: 0, cajaCierre: 0, efectivoGuardado: 300000, efectivoRealContado: null },
];

const gastosMensuales: GastoForCalc[] = [
  { fecha: D("2026-01-05"), proveedor: "A", valor: 10000, pagadoCon: "CAJA" },
  { fecha: D("2026-01-20"), proveedor: "B", valor: 5000, pagadoCon: "EFECTIVO" },
  { fecha: D("2026-02-10"), proveedor: "C", valor: 7000, pagadoCon: "TRANSFERENCIA" },
  { fecha: D("2026-03-15"), proveedor: "D", valor: 3000, pagadoCon: "CAJA" },
];

const retirosMensuales: RetiroForCalc[] = [
  { fecha: D("2026-03-16"), concepto: "Arriendo", valor: 4000, saleDe: "EFECTIVO" },
];

const transferenciaMensual: TransferenciaForCalc[] = [
  { fecha: D("2026-02-11"), total: 50000 },
];

const argsMensuales = {
  desde: D("2026-01-01"),
  hasta: D("2026-03-31"),
  cierres: cierresMensuales,
  gastos: gastosMensuales,
  retiros: retirosMensuales,
  transferencia: transferenciaMensual,
};

describe("serieMensual", () => {
  it("devuelve un punto por mes del rango, en orden ascendente", () => {
    const serie = serieMensual(argsMensuales);

    expect(serie).toEqual([
      { key: "2026-01", label: "ene", total: 110000 },
      { key: "2026-02", label: "feb", total: 250000 },
      { key: "2026-03", label: "mar", total: 303000 },
    ]);
  });

  it("suma totalVentaDelDia por mes (efectivo guardado + gastos de caja + transferencia)", () => {
    // enero: 100000 (guardado) + 10000 (gastos CAJA) + 0 = 110000
    // febrero: 200000 + 0 + 50000 (transferencia del 11) = 250000
    // marzo: 300000 + 3000 + 0 = 303000
    expect(serieMensual(argsMensuales).map((p) => p.total)).toEqual([110000, 250000, 303000]);
  });

  it("devuelve 12 puntos cuando el rango cubre 12 meses", () => {
    const serie = serieMensual({
      ...argsMensuales,
      desde: D("2026-01-01"),
      hasta: D("2026-12-31"),
      cierres: [],
      gastos: [],
      retiros: [],
      transferencia: [],
    });

    expect(serie).toHaveLength(12);
    expect(serie.map((p) => p.key)).toEqual([
      "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
      "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12",
    ]);
    expect(serie.map((p) => p.label)).toEqual([
      "ene", "feb", "mar", "abr", "may", "jun",
      "jul", "ago", "sep", "oct", "nov", "dic",
    ]);
    // Sin datos: todos los meses en cero (nunca NaN ni null).
    expect(serie.every((p) => p.total === 0)).toBe(true);
  });

  it("cambia de año correctamente al cruzar diciembre", () => {
    const serie = serieMensual({
      ...argsMensuales,
      desde: D("2025-11-15"),
      hasta: D("2026-02-10"),
      cierres: cierresMensuales.slice(1),
      gastos: [],
      retiros: [],
      transferencia: [],
    });

    expect(serie.map((p) => p.key)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(serie.map((p) => p.label)).toEqual(["nov", "dic", "ene", "feb"]);
    expect(serie[3].total).toBe(200000);
  });

  it("ignora los días que caen fuera del rango pedido", () => {
    // serieCierres() no filtra los cierres por rango, así que un cierre de
    // diciembre no puede contaminar enero.
    const serie = serieMensual({
      ...argsMensuales,
      cierres: [
        { fecha: D("2025-12-31"), cajaApertura: 0, cajaCierre: 0, efectivoGuardado: 999999, efectivoRealContado: null },
        ...cierresMensuales,
      ],
    });

    expect(serie[0]).toEqual({ key: "2026-01", label: "ene", total: 110000 });
  });

  it("devuelve ceros cuando el rango no tiene ningún movimiento", () => {
    const serie = serieMensual({
      desde: D("2026-03-01"),
      hasta: D("2026-03-31"),
      cierres: [],
      gastos: [],
      retiros: [],
      transferencia: [],
    });

    expect(serie).toEqual([{ key: "2026-03", label: "mar", total: 0 }]);
    expect(serie.every((p) => Number.isFinite(p.total))).toBe(true);
  });

  it("no se cuelga cuando `hasta` es anterior a `desde`", () => {
    const serie = serieMensual({
      ...argsMensuales,
      desde: D("2026-03-15"),
      hasta: D("2026-01-01"),
    });

    expect(serie).toHaveLength(1);
    expect(serie[0].key).toBe("2026-03");
  });
});

describe("serieMensualMetrica", () => {
  const metricas: { metrica: MetricaMensual; esperado: number[] }[] = [
    { metrica: "totalVenta", esperado: [110000, 250000, 303000] },
    { metrica: "efectivoGuardado", esperado: [100000, 200000, 300000] },
    { metrica: "gastos", esperado: [15000, 7000, 3000] },
    { metrica: "transferenciaRecibido", esperado: [0, 50000, 0] },
  ];

  it("devuelve la serie de cada métrica del dashboard", () => {
    for (const { metrica, esperado } of metricas) {
      expect(serieMensualMetrica(argsMensuales, metrica).map((p) => p.total)).toEqual(esperado);
    }
  });

  it("comparte las mismas claves y etiquetas para que todas las tarjetas alineen el eje X", () => {
    const base = serieMensualMetrica(argsMensuales, "totalVenta");

    for (const { metrica } of metricas) {
      const serie = serieMensualMetrica(argsMensuales, metrica);
      expect(serie.map((p) => p.key)).toEqual(base.map((p) => p.key));
      expect(serie.map((p) => p.label)).toEqual(base.map((p) => p.label));
    }
  });
});

describe("serieMensualSaldo", () => {
  it("devuelve el saldo acumulado al cierre de cada mes", () => {
    // enero: último día con datos = 20/01 → efectivo 100000 - 5000 (gasto
    // EFECTIVO) = 95000, transferencia 0
    // febrero: último día = 11/02 → efectivo 295000, transferencia 50000 - 7000
    // (gasto TRANSFERENCIA) = 43000
    // marzo: último día = 16/03 → efectivo 591000 (retiro EFECTIVO de 4000),
    // transferencia 43000
    const serie = serieMensualSaldo(argsMensuales);

    expect(serie).toEqual([
      { key: "2026-01", label: "ene", total: 95000 },
      { key: "2026-02", label: "feb", total: 338000 },
      { key: "2026-03", label: "mar", total: 634000 },
    ]);
  });

  it("el último mes coincide con el totalDisponible de balanceGeneral", () => {
    const bg = balanceGeneral(argsMensuales);
    const serie = serieMensualSaldo(argsMensuales);

    expect(bg.totalDisponible).toBe(634000);
    expect(serie[serie.length - 1].total).toBe(bg.totalDisponible);
  });

  it("ignora días de meses que no están en el rango", () => {
    const serie = serieMensualSaldo({
      ...argsMensuales,
      cierres: [
        { fecha: D("2025-12-31"), cajaApertura: 0, cajaCierre: 0, efectivoGuardado: 999999, efectivoRealContado: null },
        ...cierresMensuales,
      ],
    });

    expect(serie[0]).toEqual({ key: "2026-01", label: "ene", total: 95000 });
  });

  it("devuelve ceros en una ventana sin datos", () => {
    const serie = serieMensualSaldo({
      desde: D("2026-01-01"),
      hasta: D("2026-12-31"),
      cierres: [],
      gastos: [],
      retiros: [],
      transferencia: [],
    });

    expect(serie).toHaveLength(12);
    expect(serie.every((p) => p.total === 0)).toBe(true);
  });
});
