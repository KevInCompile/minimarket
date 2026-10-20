"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PagadoCon = "CAJA" | "EFECTIVO" | "TRANSFERENCIA";

type Proveedor = { id: string; nombre: string };

/**
 * Slots de filtros específicos de /gastos, renderizados dentro de FiltrosBar.
 *
 * Mantiene la convención de usar `name` para inputs nativos: el form GET
 * del FiltrosBar los recoge del FormData y los agrega a la query string.
 *
 * Para multi-select usamos un input nativo multi-value: una sola key con
 * varios valores seleccionados como ','. La page los lee y los pasa a Prisma.
 */
export function GastosFiltrosExtra({
  proveedores,
  proveedoresSeleccionados,
  pagadoConSeleccionados,
  q,
  agruparPorMes,
}: {
  proveedores: Proveedor[];
  proveedoresSeleccionados: string[];
  pagadoConSeleccionados: PagadoCon[];
  q: string;
  agruparPorMes: boolean;
}) {
  return (
    <>
      <div className="space-y-1">
        <Label
          htmlFor="filtros-proveedores"
          className="text-xs font-medium text-muted-foreground"
        >
          Proveedores
        </Label>
        <select
          id="filtros-proveedores"
          name="proveedores"
          multiple
          defaultValue={proveedoresSeleccionados}
          className="h-20 w-[200px] rounded-lg border border-input bg-transparent px-2 py-1 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          Mantén ctrl/cmd para varios.
        </p>
      </div>

      <div className="space-y-1">
        <Label
          htmlFor="filtros-pagadoCon"
          className="text-xs font-medium text-muted-foreground"
        >
          Pagado con
        </Label>
        <select
          id="filtros-pagadoCon"
          name="pagadoCon"
          multiple
          defaultValue={pagadoConSeleccionados}
          className="h-20 w-[160px] rounded-lg border border-input bg-transparent px-2 py-1 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="CAJA">Caja</option>
          <option value="EFECTIVO">Efectivo</option>
          <option value="TRANSFERENCIA">Transferencia</option>
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
          placeholder="proveedor o nota…"
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
