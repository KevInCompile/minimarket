"use client";

import type { ReactNode } from "react";
import { Smartphone } from "lucide-react";
import { PageToolbar } from "@/components/page-toolbar";
import { MonthSelector, type MesOption } from "@/components/filtros/month-selector";
import { FiltrosBar } from "@/components/filtros/filtros-bar";

/**
 * Filtros para /transferencia. Solo mes + fechas (un renglón por día).
 *
 * El título de la página vive acá también: este componente renderiza el
 * `PageToolbar` y el panel de filtros dentro de su Sheet. `subtitulo` lo
 * arma la page (server) para que el formato de moneda se haga una sola vez,
 * en el server.
 */
export function TransferenciaFilters({
  desde,
  hasta,
  mes,
  mesOptions,
  subtitulo,
}: {
  desde: Date;
  hasta: Date;
  mes: string | null;
  mesOptions: MesOption[];
  /** Línea meta del toolbar (conteo + total), formateada en el server. */
  subtitulo?: ReactNode;
}) {
  return (
    <PageToolbar
      title="Transferencia"
      icon={Smartphone}
      subtitle={subtitulo}
    >
      <FiltrosBar
        desde={desde}
        hasta={hasta}
        mes={mes}
        mesSelector={
          <MonthSelector options={mesOptions} currentMes={mes} />
        }
      />
    </PageToolbar>
  );
}