import { prisma } from "@/lib/db";
import { requireTiendaId } from "@/lib/auth-guard";
import { parseFiltrosComunes } from "@/lib/search-params";
import { parseMesLabel, mesKey } from "@/lib/dates";
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
  const tiendaId = await requireTiendaId();

  const filtros = await parseFiltrosComunes(searchParams);

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

  const [gastos, proveedores, mesesConDatos, totalProveedores] =
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
      // Meses con datos para el selector de mes
      obtenerMesesConDatos(tiendaId),
      // Conteo total de proveedores de la tienda (para mostrar "Todos")
      prisma.proveedor.count({ where: { tiendaId, activo: true } }),
    ]);

  const mesOptions = mesesConDatos.map((k) => ({
    value: k,
    label: parseMesLabel(k) ?? k,
  }));

  return (
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
      mesOptions={mesOptions}
    />
  );
}

/**
 * Devuelve las claves 'YYYY-MM' de los meses con al menos un gasto en la tienda.
 * Por ahora devuelve los últimos 18 meses con datos; si no hay datos devuelve
 * los últimos 12 meses (incluyendo el actual) para que el selector tenga UI
 * utilizable.
 */
async function obtenerMesesConDatos(tiendaId: string): Promise<string[]> {
  const result = await prisma.$queryRaw<Array<{ mes: string }>>`
    SELECT TO_CHAR(fecha, 'YYYY-MM') AS mes
    FROM "Gasto"
    WHERE "tiendaId" = ${tiendaId}
    GROUP BY TO_CHAR(fecha, 'YYYY-MM')
    ORDER BY mes DESC
    LIMIT 18
  `;
  const fromData = result.map((r) => r.mes);

  // Si no hay datos, devuelve los últimos 12 meses incluido el actual.
  if (fromData.length === 0) {
    const out: string[] = [];
    const hoy = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
      out.push(mesKey(d));
    }
    return out;
  }
  return fromData;
}
