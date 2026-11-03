import { prisma } from "@/lib/db";
import { requireTienda } from "@/lib/auth-guard";
import {
  fechaPorDefectoPara,
  navegacionMes,
  parseFiltrosComunes,
} from "@/lib/search-params";
import { etiquetaPeriodo, periodoKeyDe } from "@/lib/dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransferenciaTable } from "./transferencia-table";
import { TransferenciaFilters } from "./transferencia-filters";
import {
  TransferenciaRegistroFab,
  TransferenciaRegistroToolbar,
} from "./transferencia-form";

type Props = {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    mes?: string;
  }>;
};

export default async function TransferenciaPage({ searchParams }: Props) {
  const { id: tiendaId, diaCorte } = await requireTienda();
  const filtros = await parseFiltrosComunes(searchParams, undefined, diaCorte);

  // Meses vecinos para las flechas del selector (la derecha se apaga en el
  // mes actual) y fecha por defecto del formulario de registro: la del mes
  // que el usuario está mirando, no la de hoy (si está viendo octubre, el
  // formulario se abre con el 2026-10-31).
  const navegacion = navegacionMes(filtros.mes, filtros.hasta, diaCorte);
  const fechaInicial = fechaPorDefectoPara(filtros.hasta);

  const [transferencia, mesesConDatos] = await Promise.all([
    prisma.transferenciaDia.findMany({
      where: { tiendaId, fecha: { gte: filtros.desde, lte: filtros.hasta } },
      orderBy: { fecha: "desc" },
    }),
    obtenerMesesConDatos(tiendaId, diaCorte),
  ]);

  const total = transferencia.reduce((s, n) => s + n.total, 0);
  const mesOptions = mesesConDatos.map((k) => ({
    value: k,
    label: etiquetaPeriodo(k, diaCorte) ?? k,
  }));

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-3xl">
      <TransferenciaFilters
        diaCorte={diaCorte}
        desde={filtros.desde}
        hasta={filtros.hasta}
        mes={filtros.mes}
        mesOptions={mesOptions}
        anterior={navegacion.anterior}
        siguiente={navegacion.siguiente}
        subtitulo={
          <>
            {transferencia.length} días con Transferencia · Total recibido{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {total.toLocaleString("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
              })}
            </span>
          </>
        }
        actions={<TransferenciaRegistroToolbar fechaInicial={fechaInicial} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Transferencia recibido por día</CardTitle>
          <CardDescription>
            Un solo renglón por día. Editá el valor directamente, o usá
            «Registrar transferencia» para un día que no está en el rango.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransferenciaTable
            entries={transferencia.map((n) => ({
              id: n.id,
              fecha: n.fecha.toISOString(),
              total: n.total,
            }))}
            desde={filtros.desde.toISOString()}
            hasta={filtros.hasta.toISOString()}
          />
        </CardContent>
      </Card>

      {/* Mobile: FAB que abre la hoja inferior con el mismo formulario. */}
      <TransferenciaRegistroFab fechaInicial={fechaInicial} />
    </div>
  );
}

async function obtenerMesesConDatos(tiendaId: string, diaCorte: number): Promise<string[]> {
  const result = await prisma.$queryRaw<Array<{ mes: string }>>`
    SELECT TO_CHAR(
             fecha - (CASE WHEN EXTRACT(DAY FROM fecha) < ${diaCorte}
                           THEN INTERVAL '1 month' ELSE INTERVAL '0 days' END),
             'YYYY-MM') AS mes
    FROM "TransferenciaDia"
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
