import { PrismaClient } from "@prisma/client";
import { balanceGeneral } from "./src/lib/calc";
const p = new PrismaClient({ datasourceUrl: "postgresql://kevinbaron@localhost:5432/minimarket" });

(async () => {
  const t = await p.tienda.findFirst({ where: { slug: "tienda-demo" } });
  console.log("  diaCorte:", t?.diaCorte);

  // Periodo Oct 15 -> Nov 14
  const desde = new Date(Date.UTC(2026, 9, 15));
  const hasta = new Date(Date.UTC(2026, 10, 14, 23, 59, 59, 999));
  const tid = t!.id;

  const [gastos, retiros, transf, cierres] = await Promise.all([
    p.gasto.findMany({ where: { tiendaId: tid, fecha: { gte: desde, lte: hasta } }, include: { proveedor: { select: { nombre: true } } } }),
    p.retiro.findMany({ where: { tiendaId: tid, fecha: { gte: desde, lte: hasta } } }),
    p.transferenciaDia.findMany({ where: { tiendaId: tid, fecha: { gte: desde, lte: hasta } } }),
    p.cierreDiario.findMany({ where: { tiendaId: tid, fecha: { gte: desde, lte: hasta } } }),
  ]);

  const bg = balanceGeneral({
    desde, hasta,
    cierres: cierres.map(c => ({ fecha: c.fecha, cajaApertura: c.cajaApertura, cajaCierre: c.cajaCierre, efectivoGuardado: c.efectivoGuardado, efectivoRealContado: c.efectivoRealContado })),
    gastos: gastos.map(g => ({ fecha: g.fecha, proveedor: g.proveedor.nombre, valor: g.valor, pagadoCon: g.pagadoCon })),
    retiros: retiros.map(r => ({ fecha: r.fecha, concepto: r.concepto, valor: r.valor, saleDe: r.saleDe })),
    transferencia: transf.map(n => ({ fecha: n.fecha, total: n.total })),
  });

  // Calculo directo desde la DB
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const directo = {
    gastosCaja: sum(gastos.filter(g => g.pagadoCon === "CAJA").map(g => g.valor)),
    gastosEfectivo: sum(gastos.filter(g => g.pagadoCon === "EFECTIVO").map(g => g.valor)),
    gastosTransferencia: sum(gastos.filter(g => g.pagadoCon === "TRANSFERENCIA").map(g => g.valor)),
    retirosEfectivo: sum(retiros.filter(r => r.saleDe === "EFECTIVO").map(r => r.valor)),
    retirosTransferencia: sum(retiros.filter(r => r.saleDe === "TRANSFERENCIA").map(r => r.valor)),
    retirosCaja: sum(retiros.filter(r => r.saleDe === "CAJA").map(r => r.valor)),
    efectivoGuardadoPeriodo: sum(cierres.map(c => c.efectivoGuardado)),
    transferenciaRecibidoPeriodo: sum(transf.map(n => n.total)),
  };

  console.log("\n  CONCEPTO             APP              DIRECTO DB      OK?");
  const cmp = (n: string, a: number, d: number) =>
    console.log(`  ${n.padEnd(20)} ${String(a).padStart(14)} ${String(d).padStart(15)}   ${a === d ? "OK" : "<<< DIFIERE"}`);
  cmp("gastosCaja", bg.gastosCaja, directo.gastosCaja);
  cmp("gastosEfectivo", bg.gastosEfectivo, directo.gastosEfectivo);
  cmp("gastosTransferencia", bg.gastosTransferencia, directo.gastosTransferencia);
  cmp("retirosEfectivo", bg.retirosEfectivo, directo.retirosEfectivo);
  cmp("retirosTransferencia", bg.retirosTransferencia, directo.retirosTransferencia);
  cmp("retirosCaja", bg.retirosCaja, directo.retirosCaja);
  cmp("efectivoGuardado", bg.efectivoGuardadoPeriodo, directo.efectivoGuardadoPeriodo);
  cmp("transferenciaRecib", bg.transferenciaRecibidoPeriodo, directo.transferenciaRecibidoPeriodo);
  cmp("totalGastos", bg.totalGastos, directo.gastosCaja + directo.gastosEfectivo + directo.gastosTransferencia);

  console.log("\n  saldos (scoped al periodo):");
  console.log("    saldoEfectivoActual:      ", bg.saldoEfectivoActual);
  console.log("    saldoTransferenciaActual:", bg.saldoTransferenciaActual);
  console.log("    totalDisponible:         ", bg.totalDisponible);
  await p.$disconnect();
})();
