import { prisma } from "@/lib/db";
import { RetirosView } from "./retiros-view";
import { requireTienda } from "@/lib/auth-guard";
import {
  fechaPorDefectoPara,
  parseFiltrosComunes,
  parseMultiParam,
} from "@/lib/search-params";
import type { Prisma } from "@prisma/client";

type Props = {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    mes?: string;
    tipo?: string | string[];
    saleDe?: string | string[];
    q?: string;
    agrupar?: string;
  }>;
};

export default async function RetirosPage({ searchParams }: Props) {
  const params = await searchParams;
  const { id: tiendaId, diaCorte } = await requireTienda();
  const filtros = await parseFiltrosComunes(searchParams, undefined, diaCorte);
  const fechaInicial = fechaPorDefectoPara(filtros.hasta);

  // Filtros específicos de /retiros
  const tiposList = parseMultiParam(params.tipo);
  const saleDeList = parseMultiParam(params.saleDe);
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

  const [retiros] = await Promise.all([
    prisma.retiro.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    }),
  ]);

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
        fechaInicial={fechaInicial}
      />
    </div>
  );
}
