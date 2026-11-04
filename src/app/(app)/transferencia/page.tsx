import { prisma } from "@/lib/db";
import { requireTienda } from "@/lib/auth-guard";
import {
  fechaPorDefectoPara,
  parseFiltrosComunes,
} from "@/lib/search-params";
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
  const fechaInicial = fechaPorDefectoPara(filtros.hasta);

  const [transferencia] = await Promise.all([
    prisma.transferenciaDia.findMany({
      where: { tiendaId, fecha: { gte: filtros.desde, lte: filtros.hasta } },
      orderBy: { fecha: "desc" },
    }),
  ]);

  const total = transferencia.reduce((s, n) => s + n.total, 0);

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-3xl">
      <TransferenciaFilters
        desde={filtros.desde}
        hasta={filtros.hasta}
        mes={filtros.mes}
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
