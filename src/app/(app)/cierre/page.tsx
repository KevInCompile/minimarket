import { prisma } from "@/lib/db";
import { startOfDayUTC } from "@/lib/dates";
import { serieCierres } from "@/lib/calc";
import { CierreCards } from "./cierre-cards";
// import { ResumenPeriodo } from "./resumen-periodo";
import { CrearCierreForm } from "./crear-cierre-form";
import { requireTiendaId } from "@/lib/auth-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Plus } from "lucide-react";

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

  const [gastos, retiros, nequi, cierres] = await Promise.all([
    prisma.gasto.findMany({
      where: { tiendaId, fecha: { gte: desde, lte: hasta } },
      include: { proveedor: { select: { nombre: true } } },
    }),
    prisma.retiro.findMany({
      where: { tiendaId, fecha: { gte: desde, lte: hasta } },
    }),
    prisma.nequiDelDia.findMany({
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
    nequi: nequi.map((n) => ({ fecha: n.fecha, total: n.total })),
  });

  // Días con movimiento pero sin cierre — para mostrar como "pendientes"
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
  for (const n of nequi) {
    fechasConMovimiento.add(n.fecha.toISOString().slice(0, 10));
  }
  const pendientes = [...fechasConMovimiento]
    .filter((f) => !fechasConCierre.has(f))
    .sort();

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="size-7" /> Cierre diario
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Del {desde.toISOString().slice(0, 10)} al {hasta.toISOString().slice(0, 10)} ·{" "}
          {serie.length} días
        </p>
      </header>

      {/*<ResumenPeriodo serie={serie} />*/}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            Crear cierre para un día sin datos
          </CardTitle>
          <CardDescription>
            Útil si quiere registrar un día festivo o con caja inicial $0 antes
            de que lleguen los gastos. Una vez creado, edite los valores abajo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrearCierreForm />
        </CardContent>
      </Card>

      <CierreCards
        rows={serie.map((s) => ({
          fecha: s.fecha.toISOString(),
          cajaApertura: s.cajaApertura,
          cajaCierre: s.cajaCierre,
          efectivoGuardado: s.efectivoGuardado,
          efectivoRealContado: s.efectivoRealContado,
          gastosCaja: s.gastosCaja,
          gastosEfectivo: s.gastosEfectivo,
          totalGastos: s.totalGastos,
          entradaEstimada: s.entradaEstimada,
          retirosEfectivo: s.retirosEfectivo,
          retirosNequi: s.retirosNequi,
          nequiDelDia: s.nequiDelDia,
          efectivoAcumulado: s.efectivoAcumulado,
          nequiAcumulado: s.nequiAcumulado,
          descuadre: s.descuadre,
          totalVentaDelDia: s.totalVentaDelDia,
        }))}
        pendientes={pendientes}
      />
    </div>
  );
}
