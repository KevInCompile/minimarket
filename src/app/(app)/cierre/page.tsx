import { prisma } from "@/lib/db";
import { serieCierres } from "@/lib/calc";
import { CierreView } from "./cierre-view";
import { requireTienda } from "@/lib/auth-guard";
import { saldosInicialesHasta } from "@/lib/saldos";
import {
  fechaPorDefectoPara,
  navegacionMes,
  parseFiltrosComunes,
} from "@/lib/search-params";
import { etiquetaPeriodo, periodoKeyDe } from "@/lib/dates";

type Props = {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    mes?: string;
  }>;
};

export default async function CierrePage({ searchParams }: Props) {
  const { id: tiendaId, diaCorte } = await requireTienda();
  const filtros = await parseFiltrosComunes(searchParams, undefined, diaCorte);

  // Meses vecinos para las flechas del selector (la derecha se apaga en el
  // mes actual) y fecha por defecto del formulario: la del mes que el
  // usuario está mirando, no la de hoy.
  const navegacion = navegacionMes(filtros.mes, filtros.hasta, diaCorte);
  const fechaInicial = fechaPorDefectoPara(filtros.hasta);

  const [gastos, retiros, transferencia, cierres, mesesConDatos] =
    await Promise.all([
      prisma.gasto.findMany({
        where: { tiendaId, fecha: { gte: filtros.desde, lte: filtros.hasta } },
        include: { proveedor: { select: { nombre: true } } },
      }),
      prisma.retiro.findMany({
        where: { tiendaId, fecha: { gte: filtros.desde, lte: filtros.hasta } },
      }),
      prisma.transferenciaDia.findMany({
        where: { tiendaId, fecha: { gte: filtros.desde, lte: filtros.hasta } },
      }),
      prisma.cierreDiario.findMany({
        where: { tiendaId, fecha: { gte: filtros.desde, lte: filtros.hasta } },
      }),
      obtenerMesesConDatos(tiendaId, diaCorte),
    ]);

  // El acumulado arrastra lo que había antes del período: el saldo de cada
  // día es la cuenta corriente, no un cálculo desde cero.
  const saldoInicial = await saldosInicialesHasta(tiendaId, filtros.desde);

  const serie = serieCierres({
    desde: filtros.desde,
    saldoInicial,
    hasta: filtros.hasta,
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
    transferencia: transferencia.map((n) => ({
      fecha: n.fecha,
      total: n.total,
    })),
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

  const mesOptions = mesesConDatos.map((k) => ({
    value: k,
    label: etiquetaPeriodo(k, diaCorte) ?? k,
  }));

  return (
    <div className="p-4 md:p-10 space-y-4 max-w-5xl">
      <CierreView
        diaCorte={diaCorte}
        serie={serie}
        pendientes={pendientes}
        desde={filtros.desde}
        hasta={filtros.hasta}
        mes={filtros.mes}
        mesOptions={mesOptions}
        anterior={navegacion.anterior}
        siguiente={navegacion.siguiente}
        fechaInicial={fechaInicial}
      />
    </div>
  );
}

async function obtenerMesesConDatos(tiendaId: string, diaCorte: number): Promise<string[]> {
  // Usamos cierres porque el cierre es el "punto principal" de esta página.
  const result = await prisma.$queryRaw<Array<{ mes: string }>>`
    SELECT TO_CHAR(
             fecha - (CASE WHEN EXTRACT(DAY FROM fecha) < ${diaCorte}
                           THEN INTERVAL '1 month' ELSE INTERVAL '0 days' END),
             'YYYY-MM') AS mes
    FROM "CierreDiario"
    WHERE "tiendaId" = ${tiendaId}
    GROUP BY 1
    ORDER BY mes DESC
    LIMIT 18
  `;
  const fromData = result.map((r) => r.mes);
  if (fromData.length === 0) {
    const out: string[] = [];
    const hoy = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
      out.push(periodoKeyDe(d, diaCorte));
    }
    return out;
  }
  return fromData;
}
