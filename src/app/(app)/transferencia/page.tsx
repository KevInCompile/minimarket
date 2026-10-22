import { prisma } from "@/lib/db";
import { requireTiendaId } from "@/lib/auth-guard";
import { parseFiltrosComunes } from "@/lib/search-params";
import { parseMesLabel, mesKey } from "@/lib/dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransferenciaTable } from "./transferencia-table";
import { TransferenciaFilters } from "./transferencia-filters";

type Props = {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    mes?: string;
  }>;
};

export default async function TransferenciaPage({ searchParams }: Props) {
  const tiendaId = await requireTiendaId();
  const filtros = await parseFiltrosComunes(searchParams);

  const [transferencia, mesesConDatos] = await Promise.all([
    prisma.transferenciaDia.findMany({
      where: { tiendaId, fecha: { gte: filtros.desde, lte: filtros.hasta } },
      orderBy: { fecha: "desc" },
    }),
    obtenerMesesConDatos(tiendaId),
  ]);

  const total = transferencia.reduce((s, n) => s + n.total, 0);
  const mesOptions = mesesConDatos.map((k) => ({
    value: k,
    label: parseMesLabel(k) ?? k,
  }));

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-3xl">
      <TransferenciaFilters
        desde={filtros.desde}
        hasta={filtros.hasta}
        mes={filtros.mes}
        mesOptions={mesOptions}
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
      />

      <Card>
        <CardHeader>
          <CardTitle>Transferencia recibido por día</CardTitle>
          <CardDescription>
            Un solo renglón por día. Editá el valor directamente.
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
    </div>
  );
}

async function obtenerMesesConDatos(tiendaId: string): Promise<string[]> {
  const result = await prisma.$queryRaw<Array<{ mes: string }>>`
    SELECT TO_CHAR(fecha, 'YYYY-MM') AS mes
    FROM "TransferenciaDia"
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
