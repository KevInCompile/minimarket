"use client";

import { FiltrosBar } from "@/components/filtros/filtros-bar";

/**
 * Filtros para /cierre. Solo mes + fechas (es una serie computada).
 *
 * Es el panel suelto: lo renderiza el `PageToolbar` de `cierre-view.tsx`
 * dentro de su Sheet, así que ya no necesita tarjeta propia.
 *
 * El selector de mes NO va acá: se muestra visible en el toolbar (la
 * navegación principal) y el panel queda con el rango manual.
 */
export function CierreFilters({
  desde,
  hasta,
  mes,
}: {
  desde: Date;
  hasta: Date;
  mes: string | null;
}) {
  return <FiltrosBar desde={desde} hasta={hasta} mes={mes} />;
}
