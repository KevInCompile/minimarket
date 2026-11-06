import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  balanceGeneral,
  rankingProveedores,
  compararFlujos,
  serieMensual,
  serieDiaria,
  type CierreInput,
  type GastoForCalc,
  type RetiroForCalc,
  type TransferenciaForCalc,
} from "@/lib/calc";
import { startOfDayUTC, toISODate, etiquetaPeriodo, mesRange, periodoKeyDe } from "@/lib/dates";
import {
  parseFiltrosComunes,
  periodoComparacion,
} from "@/lib/search-params";
import { requireTienda } from "@/lib/auth-guard";
import { saldosInicialesHasta } from "@/lib/saldos";
import { BalanceCards } from "./balance-cards";
import {
  EvolucionMensual,
  GastosPorFormaDePago,
  RetirosPorOrigen,
} from "./dashboard-charts";
import { ProveedoresChart } from "./proveedores-chart";
import { UltimosGastos } from "./ultimos-gastos";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  searchParams: Promise<{ desde?: string; hasta?: string; mes?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  await auth();
  const { id: tiendaId, diaCorte } = await requireTienda();
  const params = await searchParams;
  const hoy = startOfDayUTC(new Date());

  // Mismo motor de filtros que las páginas con listas: `?mes=YYYY-MM` gana
  // sobre `desde`/`hasta`, y si no hay nada se usa el mes actual.
  const filtros = await parseFiltrosComunes(searchParams, undefined, diaCorte);

  // Periodo contra el que se compara: si el usuario está viendo un mes, es
  // el mes calendario anterior; si está viendo un rango libre, es el rango
  // anterior del mismo largo.
  const comparacion = periodoComparacion(filtros.mes, filtros.desde, filtros.hasta, diaCorte);
  const prev = { desde: comparacion.desde, hasta: comparacion.hasta };
  const etiquetaComparacion = comparacion.esMes
    ? "vs mes anterior"
    : "vs periodo anterior";

  // Los sparklines de las tarjetas KPI y el gráfico de evolución usan una
  // ventana fija de 12 meses que termina en el mes del periodo: así el eje X
  // siempre tiene 12 barras, aunque el periodo elegido sea de un solo mes.
  const ventana = ultimos12Meses(filtros.hasta, diaCorte);
  const desdeConsulta = prev.desde < ventana.desde ? prev.desde : ventana.desde;
  const hastaConsulta =
    filtros.hasta > ventana.hasta ? filtros.hasta : ventana.hasta;

  const [gastos, retiros, transferencia, cierres, ultimosGastos] =
    await Promise.all([
      prisma.gasto.findMany({
        where: {
          tiendaId,
          fecha: { gte: desdeConsulta, lte: hastaConsulta },
        },
        include: { proveedor: { select: { nombre: true } } },
      }),
      prisma.retiro.findMany({
        where: {
          tiendaId,
          fecha: { gte: desdeConsulta, lte: hastaConsulta },
        },
      }),
      prisma.transferenciaDia.findMany({
        where: {
          tiendaId,
          fecha: { gte: desdeConsulta, lte: hastaConsulta },
        },
      }),
      prisma.cierreDiario.findMany({
        where: {
          tiendaId,
          fecha: { gte: desdeConsulta, lte: hastaConsulta },
        },
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

  // El acumulado es una cuenta corriente: el saldo del período arranca con
  // lo que había antes de su primer día. Sin esto, lo que quedó del período
  // anterior se perdería (ej. si el 31 quedó -45.000, el 1 de noviembre
  // tiene que empezar en -45.000, no en 0).
  const [saldoActual, saldoAnterior] = await Promise.all([
    saldosInicialesHasta(tiendaId, filtros.desde),
    saldosInicialesHasta(tiendaId, prev.desde),
  ]);

  // serieCierres() iterates every day present in the arrays it receives, so each
  // balance must be fed period-scoped arrays; otherwise the previous window
  // would leak into the current totals.
  const bg = balanceGeneral({
    desde: filtros.desde,
    hasta: filtros.hasta,
    saldoInicial: saldoActual,
    cierres: enPeriodo(cierresForCalc, filtros.desde, filtros.hasta),
    gastos: enPeriodo(gastosForCalc, filtros.desde, filtros.hasta),
    retiros: enPeriodo(retirosForCalc, filtros.desde, filtros.hasta),
    transferencia: enPeriodo(transferenciaForCalc, filtros.desde, filtros.hasta),
  });

  const bgAnterior = balanceGeneral({
    desde: prev.desde,
    hasta: prev.hasta,
    saldoInicial: saldoAnterior,
    cierres: enPeriodo(cierresForCalc, prev.desde, prev.hasta),
    gastos: enPeriodo(gastosForCalc, prev.desde, prev.hasta),
    retiros: enPeriodo(retirosForCalc, prev.desde, prev.hasta),
    transferencia: enPeriodo(transferenciaForCalc, prev.desde, prev.hasta),
  });

  const tendencias = compararFlujos(bg, bgAnterior);

  const ranking = rankingProveedores(
    enPeriodo(gastosForCalc, filtros.desde, filtros.hasta),
    8,
  );

  // El gráfico de evolución sigue el RANGO SELECCIONADO, no una ventana
  // fija: si su titular dijera 'Este período' y mostrara la suma de doce
  // períodos, el número no coincidiría con las tarjetas de arriba.
  //
  // El grano es adaptativo: si el rango cae dentro de un solo período, una
  // barra por período sería una barra solitaria, así que se desglosa por
  // día. Si abarca varios períodos, va una barra por período.
  const argsRango = {
    desde: filtros.desde,
    hasta: filtros.hasta,
    diaCorte,
    cierres: enPeriodo(cierresForCalc, filtros.desde, filtros.hasta),
    gastos: enPeriodo(gastosForCalc, filtros.desde, filtros.hasta),
    retiros: enPeriodo(retirosForCalc, filtros.desde, filtros.hasta),
    transferencia: enPeriodo(transferenciaForCalc, filtros.desde, filtros.hasta),
  };

  const periodosEnRango = cuentaPeriodos(filtros.desde, filtros.hasta, diaCorte);
  const evolucion =
    periodosEnRango <= 1 ? serieDiaria(argsRango) : serieMensual(argsRango);

  // El rótulo del periodo incluye el nombre del mes cuando el rango viene de
  // un atajo de mes, para que se entienda de un vistazo qué se está viendo.
  const rangoTexto = `${toISODate(filtros.desde)} al ${toISODate(filtros.hasta)}`;
  const periodoTexto = filtros.mes
    ? `${etiquetaPeriodo(filtros.mes, diaCorte) ?? filtros.mes} (${rangoTexto})`
    : rangoTexto;

  // El `mes` crudo de la URL (sólo si es una clave válida) es lo que le dice
  // al dropdown de periodos del gráfico que el rango actual es un mes
  // completo y no un preset.
  const mesUrl = params.mes && mesRange(params.mes) ? params.mes : null;

  return (
    <div className="max-w-7xl space-y-6 p-6 lg:p-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Balance general</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Periodo: {periodoTexto}
          </p>
        </div>
      </header>

      <BalanceCards
        bg={bg}
        tendencias={tendencias}
        etiquetaComparacion={etiquetaComparacion}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <EvolucionMensual
          className="lg:col-span-2"
          data={evolucion}
          desde={toISODate(filtros.desde)}
          hasta={toISODate(filtros.hasta)}
          hoy={toISODate(hoy)}
          mes={mesUrl}
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
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Últimos gastos</CardTitle>
              <CardDescription>Registrados recientemente</CardDescription>
            </div>
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
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Gastos por proveedor</CardTitle>
              <CardDescription>Top del periodo</CardDescription>
            </div>
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

/**
 * Ventana de los 12 meses que termina en el mes de `hasta`: el día 1 del mes
 * once meses antes hasta el último día del mes de `hasta` (UTC).
 */
/**
 * Cuántos períodos distintos cubre un rango.
 */
function cuentaPeriodos(desde: Date, hasta: Date, diaCorte: number): number {
  const primero = periodoKeyDe(desde, diaCorte);
  const ultimo = periodoKeyDe(hasta, diaCorte);
  const [a1, m1] = primero.split("-").map(Number);
  const [a2, m2] = ultimo.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1) + 1;
}

function ultimos12Meses(hasta: Date, diaCorte = 1): {
  desde: Date;
  hasta: Date;
} {
  // La ventana cubre los últimos 12 PERÍODOS y termina en el que contiene
  // `hasta`. Con corte 1 son 12 meses del calendario; con corte 15 son 12
  // períodos que empiezan el 15.
  //
  // OJO: la clave del período es 'YYYY-MM' con el mes 1-based, pero
  // `Date.UTC` cuenta los meses desde 0. Y el FINAL de un período cae
  // en el mes siguiente (el período '2026-10' con corte 15 va del 15 de
  // octubre al 14 de noviembre). Esto tiene que espejar `mesRange`.
  const [anio, mes] = periodoKeyDe(hasta, diaCorte).split("-").map(Number);
  return {
    desde: new Date(Date.UTC(anio, mes - 1 - 11, diaCorte)),
    hasta: new Date(Date.UTC(anio, mes, diaCorte - 1, 23, 59, 59, 999)),
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