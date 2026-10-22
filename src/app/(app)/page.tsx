import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  balanceGeneral,
  rankingProveedores,
  previousPeriodRange,
  compararFlujos,
  serieMensual,
  serieMensualMetrica,
  serieMensualSaldo,
  type CierreInput,
  type GastoForCalc,
  type RetiroForCalc,
  type TransferenciaForCalc,
} from "@/lib/calc";
import { startOfDayUTC, toISODate } from "@/lib/dates";
import { requireTiendaId } from "@/lib/auth-guard";
import { BalanceCards } from "./balance-cards";
import {
  BotonKebab,
  EvolucionMensual,
  GastosPorFormaDePago,
  RetirosPorOrigen,
} from "./dashboard-charts";
import { ProveedoresChart } from "./proveedores-chart";
import { UltimosGastos } from "./ultimos-gastos";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  // Los sparklines de las tarjetas KPI y el gráfico de evolución usan una
  // ventana fija de 12 meses que termina en el mes del periodo: así el eje X
  // siempre tiene 12 barras, aunque el periodo elegido sea de un solo mes.
  const ventana = ultimos12Meses(hasta);
  const desdeConsulta = prev.desde < ventana.desde ? prev.desde : ventana.desde;
  const hastaConsulta = hasta > ventana.hasta ? hasta : ventana.hasta;

  const [gastos, retiros, transferencia, cierres, ultimosGastos] = await Promise.all([
    prisma.gasto.findMany({
      where: { tiendaId, fecha: { gte: desdeConsulta, lte: hastaConsulta } },
      include: { proveedor: { select: { nombre: true } } },
    }),
    prisma.retiro.findMany({
      where: { tiendaId, fecha: { gte: desdeConsulta, lte: hastaConsulta } },
    }),
    prisma.transferenciaDia.findMany({
      where: { tiendaId, fecha: { gte: desdeConsulta, lte: hastaConsulta } },
    }),
    prisma.cierreDiario.findMany({
      where: { tiendaId, fecha: { gte: desdeConsulta, lte: hastaConsulta } },
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

  const argsVentana = {
    desde: ventana.desde,
    hasta: ventana.hasta,
    cierres: enPeriodo(cierresForCalc, ventana.desde, ventana.hasta),
    gastos: enPeriodo(gastosForCalc, ventana.desde, ventana.hasta),
    retiros: enPeriodo(retirosForCalc, ventana.desde, ventana.hasta),
    transferencia: enPeriodo(transferenciaForCalc, ventana.desde, ventana.hasta),
  };

  const evolucion = serieMensual(argsVentana);

  return (
    <div className="max-w-7xl space-y-6 p-6 lg:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Balance general</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Periodo: {toISODate(desde)} al {toISODate(hasta)}
          </p>
        </div>
      </header>

      <BalanceCards
        bg={bg}
        tendencias={tendencias}
        series={{
          totalDisponible: serieMensualSaldo(argsVentana),
          efectivoGuardado: serieMensualMetrica(argsVentana, "efectivoGuardado"),
          gastos: serieMensualMetrica(argsVentana, "gastos"),
          transferenciaRecibido: serieMensualMetrica(argsVentana, "transferenciaRecibido"),
        }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <EvolucionMensual
          className="lg:col-span-2"
          data={evolucion}
          desde={toISODate(desde)}
          hasta={toISODate(hasta)}
          hoy={toISODate(hoy)}
        />

        <GastosPorFormaDePago
          gastosCaja={bg.gastosCaja}
          gastosEfectivo={bg.gastosEfectivo}
          gastosTransferencia={bg.gastosTransferencia}
        />

        <RetirosPorOrigen
          retirosEfectivo={bg.retirosEfectivo}
          retirosTransferencia={bg.retirosTransferencia}
          retirosCaja={bg.retirosCaja}
        />

        <Card className="border-border shadow-sm">
          <CardHeader className="grid-cols-[1fr_auto] items-center">
            <div className="min-w-0">
              <CardTitle>Últimos gastos</CardTitle>
              <CardDescription>Registrados recientemente</CardDescription>
            </div>
            <CardAction>
              <BotonKebab titulo="Últimos gastos" />
            </CardAction>
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

        <Card className="border-border shadow-sm">
          <CardHeader className="grid-cols-[1fr_auto] items-center">
            <div className="min-w-0">
              <CardTitle>Gastos por proveedor</CardTitle>
              <CardDescription>Top del periodo</CardDescription>
            </div>
            <CardAction>
              <BotonKebab titulo="Gastos por proveedor" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <Suspense fallback={null}>
              <ProveedoresChart data={ranking} />
            </Suspense>
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

/**
 * Ventana de los 12 meses que termina en el mes de `hasta`: el día 1 del mes
 * once meses antes hasta el último día del mes de `hasta` (UTC).
 */
function ultimos12Meses(hasta: Date): { desde: Date; hasta: Date } {
  const anio = hasta.getUTCFullYear();
  const mes = hasta.getUTCMonth();
  return {
    desde: new Date(Date.UTC(anio, mes - 11, 1)),
    hasta: new Date(Date.UTC(anio, mes + 1, 0, 23, 59, 59, 999)),
  };
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