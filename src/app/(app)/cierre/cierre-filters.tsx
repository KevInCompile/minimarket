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
  anterior,
  siguiente,
}: {
  desde: Date;
  hasta: Date;
  mes: string | null;
  mesOptions: MesOption[];
  /** Mes anterior para la flecha izquierda del selector (server). */
  anterior?: string | null;
  /** Mes siguiente para la flecha derecha del selector (server). */
  siguiente?: string | null;
}) {
  return (
    <FiltrosBar
      desde={desde}
      hasta={hasta}
      mes={mes}
      mesSelector={
        <MonthSelector
          options={mesOptions}
          currentMes={mes}
          anterior={anterior}
          siguiente={siguiente}
        />
      }
    />
  );
}