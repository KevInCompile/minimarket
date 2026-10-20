"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TIPOS = [
  { value: "ARRIENDO", label: "Arriendo" },
  { value: "NOMINA", label: "Nómina" },
  { value: "SERVICIOS", label: "Servicios" },
  { value: "IMPUESTOS", label: "Impuestos" },
  { value: "PRESTAMO", label: "Préstamo" },
  { value: "RETIRO_PERSONAL", label: "Retiro personal" },
  { value: "OTRO", label: "Otro" },
] as const;

const SALE_DE = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "CAJA", label: "Caja" },
] as const;

/**
 * Slots de filtros específicos para /retiros, dentro del FiltrosBar.
 */
export function RetirosFiltrosExtra({
  tiposSeleccionados,
  saleDeSeleccionados,
  q,
  agruparPorMes,
}: {
  tiposSeleccionados: string[];
  saleDeSeleccionados: ("EFECTIVO" | "TRANSFERENCIA" | "CAJA")[];
  q: string;
  agruparPorMes: boolean;
}) {
  return (
    <>
      <div className="space-y-1">
        <Label
          htmlFor="filtros-tipo"
          className="text-xs font-medium text-muted-foreground"
        >
          Tipo
        </Label>
        <select
          id="filtros-tipo"
          name="tipo"
          multiple
          defaultValue={tiposSeleccionados}
          className="h-20 w-[170px] rounded-lg border border-input bg-transparent px-2 py-1 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label
          htmlFor="filtros-saleDe"
          className="text-xs font-medium text-muted-foreground"
        >
          Sale de
        </Label>
        <select
          id="filtros-saleDe"
          name="saleDe"
          multiple
          defaultValue={saleDeSeleccionados}
          className="h-20 w-[140px] rounded-lg border border-input bg-transparent px-2 py-1 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {SALE_DE.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label
          htmlFor="filtros-q"
          className="text-xs font-medium text-muted-foreground"
        >
          Buscar
        </Label>
        <Input
          id="filtros-q"
          name="q"
          placeholder="motivo o nota…"
          defaultValue={q}
          className="w-[200px]"
        />
      </div>

      <div className="flex h-8 items-center gap-2">
        <input
          type="checkbox"
          id="filtros-agrupar"
          name="agrupar"
          value="1"
          defaultChecked={agruparPorMes}
          className="size-4 rounded border-input"
        />
        <Label
          htmlFor="filtros-agrupar"
          className="text-xs font-medium cursor-pointer"
        >
          Agrupar por mes
        </Label>
      </div>
    </>
  );
}
