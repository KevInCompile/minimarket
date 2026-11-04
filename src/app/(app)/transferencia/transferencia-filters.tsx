"use client";

import type { ReactNode } from "react";
import { Smartphone } from "lucide-react";
import { PageToolbar } from "@/components/page-toolbar";
import { FiltrosBar } from "@/components/filtros/filtros-bar";

/**
 * Filtros para /transferencia. Solo mes + fechas (un renglón por día).
 *
 * El título de la página vive acá también: este componente renderiza el
 * `PageToolbar` y el panel de filtros dentro de su Sheet. `subtitulo` lo
 * arma la page (server) para que el formato de moneda se haga una sola vez,
 * en el server.
 *
 * El selector de mes vive en la barra superior; este panel queda con el
 * rango manual.
 */
export function TransferenciaFilters({
  desde,
  hasta,
  mes,
  subtitulo,
  actions,
}: {
  desde: Date;
  hasta: Date;
  mes: string | null;
  /** Línea meta del toolbar (conteo + total), formateada en el server. */
  subtitulo?: ReactNode;
  /** Acciones del toolbar (ej. el botón "Registrar transferencia"). */
  actions?: ReactNode;
}) {
  return (
    <PageToolbar
      title="Transferencia"
      icon={Smartphone}
      subtitle={subtitulo}
      actions={actions}
    >
      <FiltrosBar desde={desde} hasta={hasta} mes={mes} />
    </PageToolbar>
  );
}