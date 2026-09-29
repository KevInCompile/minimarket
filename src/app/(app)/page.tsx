import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { balanceGeneral, rankingProveedores } from "@/lib/calc";
import { startOfDayUTC } from "@/lib/dates";
import { BalanceCards } from "./balance-cards";
import { ProveedoresChart } from "./proveedores-chart";
import { UltimosGastos } from "./ultimos-gastos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  await auth();
  const params = await searchParams;
  const hoy = startOfDayUTC(new Date());
  const desde = params.desde
    ? new Date(`${params.desde}T00:00:00.000Z`)
    : startOfMonthUTC();
  const hasta = params.hasta ? new Date(`${params.hasta}T00:00:00.000Z`) : hoy;

  const [gastos, retiros, nequi, cierres, ultimosGastos] = await Promise.all([
    prisma.gasto.findMany({
      where: { fecha: { gte: desde, lte: hasta } },
      include: { proveedor: { select: { nombre: true } } },
    }),
    prisma.retiro.findMany({
      where: { fecha: { gte: desde, lte: hasta } },
    }),
    prisma.nequiDelDia.findMany({
      where: { fecha: { gte: desde, lte: hasta } },
    }),
    prisma.cierreDiario.findMany({
      where: { fecha: { gte: desde, lte: hasta } },
    }),
    prisma.gasto.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { proveedor: { select: { nombre: true } } },
    }),
  ]);

  const gastosForCalc = gastos.map((g) => ({
    fecha: g.fecha,
    proveedor: g.proveedor.nombre,
    valor: g.valor,
    pagadoCon: g.pagadoCon,
  }));
  const retirosForCalc = retiros.map((r) => ({
    fecha: r.fecha,
    concepto: r.concepto,
    valor: r.valor,
    saleDe: r.saleDe,
  }));
  const nequiForCalc = nequi.map((n) => ({
    fecha: n.fecha,
    total: n.total,
  }));
  const cierresForCalc = cierres.map((c) => ({
    fecha: c.fecha,
    cajaApertura: c.cajaApertura,
    cajaCierre: c.cajaCierre,
    efectivoGuardado: c.efectivoGuardado,
    efectivoRealContado: c.efectivoRealContado,
  }));

  const bg = balanceGeneral({
    desde,
    hasta,
    cierres: cierresForCalc,
    gastos: gastosForCalc,
    retiros: retirosForCalc,
    nequi: nequiForCalc,
  });

  const ranking = rankingProveedores(gastosForCalc, 8);

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium uppercase tracking-wide mb-2">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Resumen del periodo
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Balance general
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Periodo: {desde.toISOString().slice(0, 10)} al{" "}
            {hasta.toISOString().slice(0, 10)}
          </p>
        </div>
      </header>

      <BalanceCards bg={bg} />

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
