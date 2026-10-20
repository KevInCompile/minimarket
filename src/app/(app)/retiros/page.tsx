import { prisma } from "@/lib/db";
import { RetirosView } from "./retiros-view";
import { requireTiendaId } from "@/lib/auth-guard";
import { parseFiltrosComunes } from "@/lib/search-params";
import { parseMesLabel, mesKey } from "@/lib/dates";
import type { Prisma } from "@prisma/client";

type Props = {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    mes?: string;
    tipo?: string;
    saleDe?: string;
    q?: string;
    agrupar?: string;
  }>;
};

export default async function RetirosPage({ searchParams }: Props) {
  const params = await searchParams;
  const tiendaId = await requireTiendaId();
  const filtros = await parseFiltrosComunes(searchParams);

  // Filtros específicos de /retiros
  const tiposList = (params.tipo ?? "").split(",").filter(Boolean);
  const saleDeList = (params.saleDe ?? "").split(",").filter(Boolean);
  const q = (params.q ?? "").trim();
  const agruparPorMes = params.agrupar === "1";

  const where: Prisma.RetiroWhereInput = {
    tiendaId,
    fecha: { gte: filtros.desde, lte: filtros.hasta },
    ...(tiposList.length > 0
      ? { tipo: { in: tiposList as ("ARRIENDO" | "NOMINA" | "SERVICIOS" | "IMPUESTOS" | "PRESTAMO" | "RETIRO_PERSONAL" | "OTRO")[] } }
      : {}),
    ...(saleDeList.length > 0
      ? { saleDe: { in: saleDeList as ("EFECTIVO" | "TRANSFERENCIA" | "CAJA")[] } }
      : {}),
    ...(q
      ? {
          OR: [
            { concepto: { contains: q, mode: "insensitive" } },
            { nota: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [retiros, mesesConDatos] = await Promise.all([
    prisma.retiro.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    }),
    obtenerMesesConDatos(tiendaId),
  ]);

  const mesOptions = mesesConDatos.map((k) => ({
    value: k,
    label: parseMesLabel(k) ?? k,
  }));

  return (
    <div className="p-4 md:p-10 max-w-7xl">
      <RetirosView
        retiros={retiros.map((r) => ({
          id: r.id,
          fecha: r.fecha.toISOString(),
          tipo: r.tipo,
          concepto: r.concepto,
          valor: r.valor,
          saleDe: r.saleDe,
          nota: r.nota,
        }))}
        filtros={{
          desde: filtros.desde,
          hasta: filtros.hasta,
          mes: filtros.mes,
          tiposSeleccionados: tiposList,
          saleDeSeleccionados: saleDeList as ("EFECTIVO" | "TRANSFERENCIA" | "CAJA")[],
          q,
          agruparPorMes,
        }}
        mesOptions={mesOptions}
      />
    </div>
  );
}

async function obtenerMesesConDatos(tiendaId: string): Promise<string[]> {
  const result = await prisma.$queryRaw<Array<{ mes: string }>>`
    SELECT TO_CHAR(fecha, 'YYYY-MM') AS mes
    FROM "Retiro"
    WHERE "tiendaId" = ${tiendaId}
    GROUP BY TO_CHAR(fecha, 'YYYY-MM')
    ORDER BY mes DESC
    LIMIT 18
  `;
  const fromData = result.map((r) => r.mes);
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
