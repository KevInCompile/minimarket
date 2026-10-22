import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  balanceGeneral,
  rankingProveedores,
  previousPeriodRange,
  compararFlujos,
  type CierreInput,
  type GastoForCalc,
  type RetiroForCalc,
  type TransferenciaForCalc,
} from "@/lib/calc";
import { startOfDayUTC } from "@/lib/dates";
import { requireTiendaId } from "@/lib/auth-guard";
import { BalanceCards } from "./balance-cards";
import { ProveedoresChart } from "./proveedores-chart";
import { UltimosGastos } from "./ultimos-gastos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  await auth();
  const tiendaId = await requireTiendaId();
  const params = await searchParams;
  const hoy = startOfDayUTC(new Date());
  const desde = params.desde
    ? new Date(`${params.desde}T00:00:00.000Z`)
    : startOfMonthUTC();
  const hasta = params.hasta ? new Date(`${params.hasta}T00:00:00.000Z`) : hoy;

  // The previous window is fetched in the same queries so the period-over-period
  // comparison costs no extra round-trips.
  const prev = previousPeriodRange(desde, hasta);

  const [gastos, retiros, transferencia, cierres, ultimosGastos] = await Promise.all([
    prisma.gasto.findMany({
      where: { tiendaId, fecha: { gte: prev.desde, lte: hasta } },
      include: { proveedor: { select: { nombre: true } } },
    }),
    prisma.retiro.findMany({
      where: { tiendaId, fecha: { gte: prev.desde, lte: hasta } },
    }),
    prisma.transferenciaDia.findMany({
      where: { tiendaId, fecha: { gte: prev.desde, lte: hasta } },
    }),
    prisma.cierreDiario.findMany({
      where: { tiendaId, fecha: { gte: prev.desde, lte: hasta } },
    }),
    prisma.gasto.findMany({
      where: { tiendaId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { proveedor: { select: { nombre: true } } },
    }),
  ]);

  const gastosForCalc = gastos.map(toGastoForCalc);
  const retirosForCalc = retiros.map(toRetiroForCalc);
  const transferenciaForCalc = transferencia.map(toTransferenciaForCalc);
  const cierresForCalc = cierres.map(toCierreInput);

  // serieCierres() iterates every day present in the arrays it receives, so each
  // balance must be fed period-scoped arrays; otherwise the previous window
  // would leak into the current totals.
  const bg = balanceGeneral({
    desde,
    hasta,
    cierres: enPeriodo(cierresForCalc, desde, hasta),
    gastos: enPeriodo(gastosForCalc, desde, hasta),
    retiros: enPeriodo(retirosForCalc, desde, hasta),
    transferencia: enPeriodo(transferenciaForCalc, desde, hasta),
  });

  const bgAnterior = balanceGeneral({
    desde: prev.desde,
    hasta: prev.hasta,
    cierres: enPeriodo(cierresForCalc, prev.desde, prev.hasta),
    gastos: enPeriodo(gastosForCalc, prev.desde, prev.hasta),
    retiros: enPeriodo(retirosForCalc, prev.desde, prev.hasta),
    transferencia: enPeriodo(transferenciaForCalc, prev.desde, prev.hasta),
  });

  const tendencias = compararFlujos(bg, bgAnterior);

  const ranking = rankingProveedores(enPeriodo(gastosForCalc, desde, hasta), 8);

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Balance general
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Periodo: {desde.toISOString().slice(0, 10)} al{" "}
            {hasta.toISOString().slice(0, 10)}
          </p>
        </div>
      </header>

      <BalanceCards bg={bg} tendencias={tendencias} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-violet-200 dark:border-violet-800">
          <CardHeader>
            <CardTitle>Gastos por proveedor</CardTitle>
            <CardDescription>Top del periodo</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={null}>
              <ProveedoresChart data={ranking} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle>Últimos gastos</CardTitle>
            <CardDescription>Registrados recientemente</CardDescription>
          </CardHeader>
          <CardContent>
            <UltimosGastos
              gastos={ultimosGastos.map((g) => ({
                id: g.id,
                fecha: g.fecha.toISOString(),
                proveedor: g.proveedor.nombre,
                valor: g.valor,
                pagadoCon: g.pagadoCon,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function startOfMonthUTC(): Date {
  const d = startOfDayUTC(new Date());
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Keeps only the rows whose fecha falls inside the inclusive window. */
function enPeriodo<T extends { fecha: Date }>(items: T[], d: Date, h: Date): T[] {
  const t0 = d.getTime();
  const t1 = h.getTime();
  return items.filter((i) => i.fecha.getTime() >= t0 && i.fecha.getTime() <= t1);
}

/** Prisma row shape for Gastos: `proveedor` is still a relation, not a name. */
type GastoRow = Omit<GastoForCalc, "proveedor"> & {
  proveedor: { nombre: string };
};

function toGastoForCalc(g: GastoRow): GastoForCalc {
  return {
    fecha: g.fecha,
    proveedor: g.proveedor.nombre,
    valor: g.valor,
    pagadoCon: g.pagadoCon,
  };
}

function toRetiroForCalc(r: RetiroForCalc): RetiroForCalc {
  return {
    fecha: r.fecha,
    concepto: r.concepto,
    valor: r.valor,
    saleDe: r.saleDe,
  };
}

function toTransferenciaForCalc(n: TransferenciaForCalc): TransferenciaForCalc {
  return {
    fecha: n.fecha,
    total: n.total,
  };
}

function toCierreInput(c: CierreInput): CierreInput {
  return {
    fecha: c.fecha,
    cajaApertura: c.cajaApertura,
    cajaCierre: c.cajaCierre,
    efectivoGuardado: c.efectivoGuardado,
    efectivoRealContado: c.efectivoRealContado,
  };
}
