"use client";

import { MonthSelector, type MesOption } from "@/components/filtros/month-selector";
import { FiltrosBar } from "@/components/filtros/filtros-bar";

/**
 * Filtros para /cierre. Solo mes + fechas (es una serie computada).
 *
 * Es el panel suelto: lo renderiza el `PageToolbar` de `cierre-view.tsx`
 * dentro de su Sheet, así que ya no necesita tarjeta propia.
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
    <FiltrosBar
      desde={desde}
      hasta={hasta}
      mes={mes}
      mesSelector={
        <MonthSelector options={mesOptions} currentMes={mes} />
      }
    />
  );
}