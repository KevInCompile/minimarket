import "server-only";
import { prisma } from "@/lib/db";
import { normalizarDiaCorte, periodosIniciales } from "@/lib/dates";

/**
 * Claves 'YYYY-MM' de los períodos con al menos un movimiento en la tienda.
 *
 * El período depende del DÍA DE CORTE: con corte 15, el 5 de octubre
 * pertenece al período que empezó el 15 de septiembre. Por eso el
 * agrupamiento es por período y no por mes del calendario.
 *
 * Devuelve los períodos en orden descendente (los más recientes primero).
 */
export async function obtenerMesesConDatos(
  tiendaId: string,
  diaCorte: number,
  limite = 18,
): Promise<string[]> {
  const corte = normalizarDiaCorte(diaCorte);
  const result = await prisma.$queryRaw<Array<{ mes: string }>>`
    SELECT TO_CHAR(
             fecha - (CASE WHEN EXTRACT(DAY FROM fecha) < ${corte}
                           THEN INTERVAL '1 month' ELSE INTERVAL '0 days' END),
             'YYYY-MM') AS mes
    FROM (
      SELECT fecha FROM "Gasto" WHERE "tiendaId" = ${tiendaId}
      UNION ALL
      SELECT fecha FROM "Retiro" WHERE "tiendaId" = ${tiendaId}
      UNION ALL
      SELECT fecha FROM "TransferenciaDia" WHERE "tiendaId" = ${tiendaId}
      UNION ALL
      SELECT fecha FROM "CierreDiario" WHERE "tiendaId" = ${tiendaId}
    ) AS movimientos
    GROUP BY 1
    ORDER BY mes DESC
    LIMIT ${limite}
  `;

  const periodos = result.map((r) => r.mes);
  return periodos.length > 0
    ? periodos
    : periodosIniciales(new Date(), corte);
}
