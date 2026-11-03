"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MesOption = {
  /** Clave 'YYYY-MM'. Usa "all" para "Todos". */
  value: string;
  /** Etiqueta legible (ej. "Septiembre 2026"). */
  label: string;
};

/**
 * Dropdown para elegir un mes como atajo de rango temporal, con flechas de
 * navegación al mes anterior y al mes siguiente.
 *
 * - "all" (Todos) → limpia los filtros de fecha.
 * - Cualquier "YYYY-MM" → navega a ?mes=YYYY-MM (el server resuelve el rango).
 * - Las flechas hacen lo mismo que el dropdown, pero sin abrirlo: saltan al
 *   mes vecino del que se está viendo.
 *
 * El componente vive como cliente porque necesita `router.push`.
 * Los meses se reciben como prop desde el server (que es quien sabe
 * qué meses tienen datos según la DB).
 *
 * `anterior` y `siguiente` los calcula el server (`navegacionMes`): la
 * flecha derecha llega en null cuando ya se está en el mes actual, y en ese
 * caso queda deshabilitada para no dejar registrar en el futuro.
 */
export function MonthSelector({
  options,
  currentMes,
  anterior,
  siguiente,
}: {
  options: MesOption[];
  currentMes: string | null;
  /** Clave 'YYYY-MM' del mes anterior (null si no hay). */
  anterior?: string | null;
  /** Clave 'YYYY-MM' del mes siguiente (null si no se puede avanzar). */
  siguiente?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  /**
   * Navega a `?mes=YYYY-MM` conservando el resto de los searchParams
   * (filtros específicos por página, como proveedor, saleDe, etc.).
   */
  const irAMes = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", value);
    // Si hay mes seleccionado, no tiene sentido conservar desde/hasta
    // porque el rango se sobreescribe.
    params.delete("desde");
    params.delete("hasta");

    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => router.push(url));
  };

  const handleChange = (raw: string | null) => {
    if (!raw) return;
    const value = raw === "all" ? null : raw;

    if (value) {
      irAMes(value);
      return;
    }

    // "Todos los meses": se quita el atajo de mes y se conservan el resto
    // de los searchParams.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("mes");
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => router.push(url));
  };

  // Para evitar problemas con el Select (que renderiza un item por value),
  // usamos "all" como sentinela.
  const currentValue = currentMes ?? "all";

  return (
    <div className="flex w-full items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Mes anterior"
        title="Mes anterior"
        // Siempre habilitado: el mes anterior siempre existe.
        onClick={() => anterior && irAMes(anterior)}
        className="shrink-0 text-muted-foreground"
      >
        <ChevronLeft />
      </Button>

      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger className="min-w-0 flex-1" aria-label="Mes">
          <SelectValue placeholder="Mes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los meses</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Mes siguiente"
        title="Mes siguiente"
        disabled={!siguiente}
        onClick={() => siguiente && irAMes(siguiente)}
        className="shrink-0 text-muted-foreground"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
