"use client";

import { MonthSelector, type MesOption } from "@/components/filtros/month-selector";
import { FiltrosBar } from "@/components/filtros/filtros-bar";

/**
 * Filtros para /cierre. Solo mes + fechas (es una serie computada).
 */
export function CierreFilters({
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
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 md:p-4 shadow-xs">
      <FiltrosBar
        desde={desde}
        hasta={hasta}
        mes={mes}
        mesSelector={
          <MonthSelector options={mesOptions} currentMes={mes} />
        }
      />
    </div>
  );
}