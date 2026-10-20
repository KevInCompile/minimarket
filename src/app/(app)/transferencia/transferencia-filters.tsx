"use client";

import { MonthSelector, type MesOption } from "@/components/filtros/month-selector";
import { FiltrosBar } from "@/components/filtros/filtros-bar";

/**
 * Filtros para /transferencia. Solo mes + fechas (un renglón por día,
 * no hay más dimensiones para filtrar).
 */
export function TransferenciaFilters({
  desde,
  hasta,
  mes,
  mesOptions,
}: {
  desde: Date;
  hasta: Date;
  mes: string | null;
  mesOptions: MesOption[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Mes
          </label>
          <MonthSelector options={mesOptions} currentMes={mes} />
        </div>
      </div>
      <FiltrosBar desde={desde} hasta={hasta} mes={mes} />
    </div>
  );
}
