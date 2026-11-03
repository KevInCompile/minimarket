import { prisma } from "@/lib/db";
import { RetirosView } from "./retiros-view";
import { requireTienda } from "@/lib/auth-guard";
import {
  fechaPorDefectoPara,
  navegacionMes,
  parseFiltrosComunes,
} from "@/lib/search-params";
import { etiquetaPeriodo, periodoKeyDe } from "@/lib/dates";
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
  const { id: tiendaId, diaCorte } = await requireTienda();
  const filtros = await parseFiltrosComunes(searchParams, undefined, diaCorte);

  // Meses vecinos para las flechas del selector (la derecha se apaga en el
  // mes actual) y fecha por defecto del formulario: la del mes que el
  // usuario está mirando, no la de hoy.
  const navegacion = navegacionMes(filtros.mes, filtros.hasta, diaCorte);
  const fechaInicial = fechaPorDefectoPara(filtros.hasta);

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
    obtenerMesesConDatos(tiendaId, diaCorte),
  ]);

  const mesOptions = mesesConDatos.map((k) => ({
    value: k,
    label: etiquetaPeriodo(k, diaCorte) ?? k,
  }));

  return (
    <div className="p-4 md:p-10 max-w-7xl">
      <RetirosView
        diaCorte={diaCorte}
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
        anterior={navegacion.anterior}
        siguiente={navegacion.siguiente}
        fechaInicial={fechaInicial}
      />
    </div>
  );
}

async function obtenerMesesConDatos(tiendaId: string, diaCorte: number): Promise<string[]> {
  const result = await prisma.$queryRaw<Array<{ mes: string }>>`
    SELECT TO_CHAR(
             fecha - (CASE WHEN EXTRACT(DAY FROM fecha) < ${diaCorte}
                           THEN INTERVAL '1 month' ELSE INTERVAL '0 days' END),
             'YYYY-MM') AS mes
    FROM "Retiro"
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
