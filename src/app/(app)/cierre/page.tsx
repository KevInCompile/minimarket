import { prisma } from "@/lib/db";
import { startOfDayUTC } from "@/lib/dates";
import { serieCierres } from "@/lib/calc";
import { CierreView } from "./cierre-view";
import { requireTiendaId } from "@/lib/auth-guard";

type Props = {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
};

export default async function CierrePage({ searchParams }: Props) {
  const params = await searchParams;
  const tiendaId = await requireTiendaId();
  const hoy = startOfDayUTC(new Date());
  const desde = params.desde
    ? new Date(`${params.desde}T00:00:00.000Z`)
    : new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const hasta = params.hasta ? new Date(`${params.hasta}T00:00:00.000Z`) : hoy;

  const [gastos, retiros, transferencia, cierres] = await Promise.all([
    prisma.gasto.findMany({
      where: { tiendaId, fecha: { gte: desde, lte: hasta } },
      include: { proveedor: { select: { nombre: true } } },
    }),
    prisma.retiro.findMany({
      where: { tiendaId, fecha: { gte: desde, lte: hasta } },
    }),
    prisma.transferenciaDia.findMany({
      where: { tiendaId, fecha: { gte: desde, lte: hasta } },
    }),
    prisma.cierreDiario.findMany({
      where: { tiendaId, fecha: { gte: desde, lte: hasta } },
    }),
  ]);

  const serie = serieCierres({
    desde,
    hasta,
    cierres: cierres.map((c) => ({
      fecha: c.fecha,
      cajaApertura: c.cajaApertura,
      cajaCierre: c.cajaCierre,
      efectivoGuardado: c.efectivoGuardado,
      efectivoRealContado: c.efectivoRealContado,
    })),
    gastos: gastos.map((g) => ({
      fecha: g.fecha,
      proveedor: g.proveedor.nombre,
      valor: g.valor,
      pagadoCon: g.pagadoCon,
    })),
    retiros: retiros.map((r) => ({
      fecha: r.fecha,
      concepto: r.concepto,
      valor: r.valor,
      saleDe: r.saleDe,
    })),
    transferencia: transferencia.map((n) => ({ fecha: n.fecha, total: n.total })),
  });

  // Dias con movimiento pero sin cierre - para mostrar como "pendientes"
  const fechasConCierre = new Set(
    cierres.map((c) => c.fecha.toISOString().slice(0, 10)),
  );
  const fechasConMovimiento = new Set<string>();
  for (const g of gastos) {
    fechasConMovimiento.add(g.fecha.toISOString().slice(0, 10));
  }
  for (const r of retiros) {
    fechasConMovimiento.add(r.fecha.toISOString().slice(0, 10));
  }
  for (const n of transferencia) {
    fechasConMovimiento.add(n.fecha.toISOString().slice(0, 10));
  }
  const pendientes = [...fechasConMovimiento]
    .filter((f) => !fechasConCierre.has(f))
    .sort();

  return (
    <div className="p-4 md:p-10 max-w-5xl">
      <CierreView serie={serie} pendientes={pendientes} />
    </div>
  );
}
