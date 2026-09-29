"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  crearGastoAction,
  eliminarGastoAction,
  type GastoState,
} from "@/server/actions/gastos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toISODate } from "@/lib/dates";
import { Plus } from "lucide-react";

const INITIAL: GastoState = { ok: true, ts: 0 };

export function GastoForm({
  proveedores,
}: {
  proveedores: { id: string; nombre: string }[];
}) {
  const [state, action, pending] = useActionState(crearGastoAction, INITIAL);
  const lastTs = useRef(0);

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) toast.error(state.error);
      // El éxito se maneja desde el padre (lista) con un toast de undo
    }
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fecha">Fecha</Label>
        <Input id="fecha" name="fecha" type="date" defaultValue={toISODate(new Date())} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="proveedor">Proveedor / Concepto</Label>
        <Input
          id="proveedor"
          name="proveedor"
          list="proveedores-list"
          required
          placeholder="Ej: Coca-Cola"
        />
        <datalist id="proveedores-list">
          {proveedores.map((p) => (
            <option key={p.id} value={p.nombre} />
          ))}
        </datalist>
      </div>
      <div className="space-y-2">
        <Label htmlFor="valor">Valor (COP)</Label>
        <Input
          id="valor"
          name="valor"
          type="text"
          inputMode="numeric"
          required
          placeholder="50000"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pagadoCon">Pagado con</Label>
        <Select name="pagadoCon" defaultValue="CAJA">
          <SelectTrigger id="pagadoCon">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CAJA">Caja (del día)</SelectItem>
            <SelectItem value="EFECTIVO">Efectivo (del guardado)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="nota">Nota (opcional)</Label>
        <Input id="nota" name="nota" placeholder="…" />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        <Plus className="size-4" />
        {pending ? "Guardando…" : "Registrar gasto"}
      </Button>
    </form>
  );
}

// Re-export para que la tabla pueda llamar al eliminar con undo
export { eliminarGastoAction };
