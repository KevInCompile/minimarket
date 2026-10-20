"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { filtrosToQuery } from "@/lib/search-params";

export type MesOption = {
  /** Clave 'YYYY-MM'. Usa "all" para "Todos". */
  value: string;
  /** Etiqueta legible (ej. "Septiembre 2026"). */
  label: string;
};

/**
 * Dropdown para elegir un mes como atajo de rango temporal.
 *
 * - "all" (Todos) → limpia los filtros de fecha.
 * - Cualquier "YYYY-MM" → navega a ?mes=YYYY-MM (el server resuelve el rango).
 *
 * El componente vive como cliente porque necesita `router.push`.
 * Los meses se reciben como prop desde el server (que es quien sabe
 * qué meses tienen datos según la DB).
 */
export function MonthSelector({
  options,
  currentMes,
}: {
  options: MesOption[];
  currentMes: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleChange = (raw: string | null) => {
    if (!raw) return;
    const value = raw === "all" ? null : raw;

    // Mantener el resto de los searchParams intactos (filtros específicos
    // por página, como proveedor, saleDe, etc.).
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("mes", value);
      // Si hay mes seleccionado, no tiene sentido conservar desde/hasta
      // porque el rango se sobreescribe.
      params.delete("desde");
      params.delete("hasta");
    } else {
      params.delete("mes");
    }

    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => router.push(url));
  };

  // Para evitar problemas con el Select (que renderiza un item por value),
  // usamos "all" como sentinela.
  const currentValue = currentMes ?? "all";

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="w-full" aria-label="Mes">
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
  );
}
