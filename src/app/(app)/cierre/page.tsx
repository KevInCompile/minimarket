import { prisma } from "@/lib/db";
import { serieCierres } from "@/lib/calc";
import { CierreView } from "./cierre-view";
import { requireTienda } from "@/lib/auth-guard";
import { saldosInicialesHasta } from "@/lib/saldos";
import { aperturasPorDefecto as calcularAperturasPorDefecto } from "@/lib/cierre";
import { toISODate } from "@/lib/dates";
import {
  fechaPorDefectoPara,
  parseFiltrosComunes,
} from "@/lib/search-params";

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
  const fechaInicial = fechaPorDefectoPara(filtros.hasta);

  const [gastos, retiros, transferencia, cierres] =
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
    ]);

  // El acumulado arrastra lo que había antes del período: el saldo de cada
  // día es la cuenta corriente, no un cálculo desde cero.
  const [saldoInicial, cierrePrevio] = await Promise.all([
    saldosInicialesHasta(tiendaId, filtros.desde),
    // El último cierre anterior al período: la plata que quedó en caja
    // sigue en caja al día siguiente, así que es la apertura por defecto de
    // los primeros días del período. Solo cuentan los cierres que el usuario
    // ya llenó: una fila recién creada todavía no dice cuánto había en caja.
    prisma.cierreDiario.findFirst({
      where: {
        tiendaId,
        fecha: { lt: filtros.desde },
        OR: [
          { cajaCierre: { not: 0 } },
          { efectivoGuardado: { not: 0 } },
          { efectivoRealContado: { not: null } },
        ],
      },
      orderBy: { fecha: "desc" },
      select: {
        fecha: true,
        cajaApertura: true,
        cajaCierre: true,
        efectivoGuardado: true,
        efectivoRealContado: true,
      },
    }),
  ]);

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
    cierres.map((c) => toISODate(c.fecha)),
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

  // La caja de apertura por defecto de un día es la caja de cierre del
  // cierre anterior: la plata de la caja no se reinicia sola. Solo aplica a
  // los días que todavía NO tienen cierre (los que sí lo tienen usan el
  // valor guardado, que el usuario puede editar).
  const aperturasSugeridas = calcularAperturasPorDefecto({
    dias: serie.map((s) => s.fecha),
    cierres: [...(cierrePrevio ? [cierrePrevio] : []), ...cierres],
  });

  return (
    <div className="p-4 md:p-10 space-y-4 max-w-5xl">
      <CierreView
        serie={serie}
        pendientes={pendientes}
        aperturasPorDefecto={aperturasSugeridas}
        desde={filtros.desde}
        hasta={filtros.hasta}
        mes={filtros.mes}
        fechaInicial={fechaInicial}
      />
    </div>
  );
}
