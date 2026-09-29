import { Badge } from "@/components/ui/badge";
import { formatCOP } from "@/lib/format";
import { diaSemana, formatShortDate } from "@/lib/dates";

type GastoView = {
  id: string;
  fecha: string;
  proveedor: string;
  valor: number;
  pagadoCon: "CAJA" | "EFECTIVO";
};

export function UltimosGastos({ gastos }: { gastos: GastoView[] }) {
  if (gastos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Todavía no se cargaron gastos.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {gastos.map((g) => {
        const fecha = new Date(g.fecha);
        return (
          <li key={g.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{g.proveedor}</div>
              <div className="text-xs text-muted-foreground">
                {diaSemana(fecha)} {formatShortDate(fecha)}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={g.pagadoCon === "CAJA" ? "secondary" : "outline"}
                className="font-normal"
              >
                {g.pagadoCon}
              </Badge>
              <span className="text-sm font-semibold tabular-nums">
                {formatCOP(g.valor)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
