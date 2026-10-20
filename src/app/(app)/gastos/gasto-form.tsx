"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
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
import { crearGastoAction, type GastoState } from "@/server/actions/gastos";

const INITIAL: GastoState = { ok: true, ts: 0 };

type Proveedor = { id: string; nombre: string };

/**
 * Formulario de gasto. Solo el formulario — sin FAB, sin modal, sin sheet.
 *
 * El contenedor (GastosView) decide cómo se muestra: dentro de un Sheet en
 * desktop, dentro de un modal bottom-sheet en mobile (controlado por el FAB).
 *
 * Este componente solo gestiona el estado del submit y notifica el éxito/error.
 */
export function GastoForm({
  proveedores,
  onClose,
  onSuccess,
}: {
  proveedores: Proveedor[];
  onClose?: () => void;
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState(crearGastoAction, INITIAL);
  const lastOkRef = useRef(false);

  useEffect(() => {
    if (state.ts && state.ts !== INITIAL.ts) {
      if (state.error) {
        toast.error(state.error);
      } else if (state.ok && !lastOkRef.current) {
        toast.success("Gasto registrado");
        onSuccess?.();
        onClose?.();
      }
      lastOkRef.current = state.ok;
    }
  }, [state, onSuccess, onClose]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fecha">Fecha</Label>
        <Input
          id="fecha"
          name="fecha"
          type="date"
          defaultValue={toISODate(new Date())}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="proveedor">Proveedor</Label>
        <Input
          id="proveedor"
          name="proveedor"
          list="proveedores-list"
          placeholder="Escriba o elija un proveedor"
          required
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
            <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
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