import { prisma } from "@/lib/db";
import { requireTienda } from "@/lib/auth-guard";
import {
  fechaPorDefectoPara,
  parseFiltrosComunes,
} from "@/lib/search-params";
import { GastosView } from "./gastos-view";
import type { Prisma } from "@prisma/client";

type Props = {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    mes?: string;
    proveedores?: string;
    pagadoCon?: string;
    q?: string;
    agrupar?: string;
  }>;
};

export default async function GastosPage({ searchParams }: Props) {
  const params = await searchParams;
  const { id: tiendaId, diaCorte } = await requireTienda();

  const filtros = await parseFiltrosComunes(searchParams, undefined, diaCorte);
  const fechaInicial = fechaPorDefectoPara(filtros.hasta);

  // Filtros específicos de /gastos
  const proveedoresIds = (params.proveedores ?? "")
    .split(",")
    .filter(Boolean);
  const pagadoConList = (params.pagadoCon ?? "")
    .split(",")
    .filter(Boolean);
  const q = (params.q ?? "").trim();
  const agruparPorMes = params.agrupar === "1";

  // Query: gastos en el rango, con filtros específicos aplicados
  const where: Prisma.GastoWhereInput = {
    tiendaId,
    fecha: { gte: filtros.desde, lte: filtros.hasta },
    ...(proveedoresIds.length > 0
      ? { proveedorId: { in: proveedoresIds } }
      : {}),
    ...(pagadoConList.length > 0
      ? {
          pagadoCon: {
            in: pagadoConList as ("CAJA" | "EFECTIVO" | "TRANSFERENCIA")[],
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { nota: { contains: q, mode: "insensitive" } },
            { proveedor: { nombre: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [gastos, proveedores] =
    await Promise.all([
      prisma.gasto.findMany({
        where,
        orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        include: { proveedor: { select: { nombre: true } } },
      }),
      prisma.proveedor.findMany({
        where: { tiendaId, activo: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true },
      }),
    ]);

  return (
    <div className="p-4 md:p-10 max-w-7xl">
      <GastosView
        gastos={gastos.map((g) => ({
          id: g.id,
          fecha: g.fecha.toISOString().slice(0, 10),
          proveedor: g.proveedor.nombre,
          proveedorId: g.proveedorId,
          valor: g.valor,
          pagadoCon: g.pagadoCon,
          nota: g.nota,
        }))}
        proveedores={proveedores}
        filtros={{
          desde: filtros.desde,
          hasta: filtros.hasta,
          mes: filtros.mes,
          proveedoresSeleccionados: proveedoresIds,
          pagadoConSeleccionados: pagadoConList as ("CAJA" | "EFECTIVO" | "TRANSFERENCIA")[],
          q,
          agruparPorMes,
        }}
        fechaInicial={fechaInicial}
      />
    </div>
  );
}
