"use client";

import { Field } from "@/components/filtros/filtros-bar";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/filtros/multi-select";
import { Layers } from "lucide-react";

type PagadoCon = "CAJA" | "EFECTIVO" | "TRANSFERENCIA";
type Proveedor = { id: string; nombre: string };

const OPCIONES_PAGADO_CON: { value: PagadoCon; label: string }[] = [
  { value: "CAJA", label: "Caja" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
];

/**
 * Filtros específicos para /gastos. Se renderizan dentro del FiltrosBar
 * y comparten el mismo form GET (los `<input name>` nativos viajan al
 * submit junto con los demás).
 *
 * Este componente NO maneja estado propio de filtros — recibe el estado
 * efectivo (no controlados) y emite cambios al padre vía callbacks.
 *
 * La razón de NO controlados es para que el FiltrosBar pueda serializar
 * el FormData tal cual sin re-sincronizar. MultiSelect emite `<input
 * type="hidden">` por cada valor, que el form recoge como varios
 * formData.getAll(nombre).
 */
export function GastosFiltrosExtra({
  proveedores,
  proveedoresSeleccionados,
  onProveedoresChange,
  pagadoConSeleccionados,
  onPagadoConChange,
  q,
  onQChange,
  agruparPorMes,
  onAgruparChange,
}: {
  proveedores: Proveedor[];
  proveedoresSeleccionados: string[];
  onProveedoresChange: (next: string[]) => void;
  pagadoConSeleccionados: PagadoCon[];
  onPagadoConChange: (next: PagadoCon[]) => void;
  q: string;
  onQChange: (next: string) => void;
  agruparPorMes: boolean;
  onAgruparChange: (next: boolean) => void;
}) {
  return (
    <>
      <Field label="Proveedores" className="min-w-[140px] md:min-w-[180px] md:max-w-[260px]">
        <MultiSelect
          name="proveedores"
          options={proveedores.map((p) => ({ value: p.id, label: p.nombre }))}
          value={proveedoresSeleccionados}
          onChange={onProveedoresChange}
          placeholder="Proveedores"
          emptyLabel="Todos los proveedores"
        />
      </Field>

      <Field label="Pagado con" className="min-w-[140px] md:min-w-[160px] md:max-w-[200px]">
        <MultiSelect
          name="pagadoCon"
          options={OPCIONES_PAGADO_CON}
          value={pagadoConSeleccionados}
          onChange={(v) =>
            onPagadoConChange(v as PagadoCon[])
          }
          placeholder="Forma de pago"
          emptyLabel="Cualquiera"
        />
      </Field>

      <Field label="Buscar" className="min-w-[160px] md:min-w-[200px] md:max-w-[260px]">
        <Input
          name="q"
          placeholder="proveedor o nota…"
          defaultValue={q}
          onChange={(e) => onQChange(e.target.value)}
          className="w-full"
        />
      </Field>

      <Field label="Agrupar">
        <label
          htmlFor="filtros-agrupar"
          className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm transition-colors hover:bg-muted/50 has-[input:checked]:bg-primary has-[input:checked]:text-primary-foreground has-[input:checked]:border-primary dark:bg-input/30 dark:hover:bg-input/50"
        >
          <input
            type="checkbox"
            id="filtros-agrupar"
            name="agrupar"
            value="1"
            checked={agruparPorMes}
            onChange={(e) => onAgruparChange(e.target.checked)}
            className="sr-only"
          />
          <Layers className="size-3.5" />
          Por mes
        </label>
      </Field>
    </>
  );
}
