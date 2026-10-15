"use client";

import { useActionState, useState, useEffect, useRef } from "react";
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
  const [open, setOpen] = useState(false);
  const lastOkRef = useRef(false);

  useEffect(() => {
    if (state.ts && state.ts !== INITIAL.ts) {
      if (state.error) {
        toast.error(state.error);
      } else if (state.ok && !lastOkRef.current) {
        toast.success("Gasto registrado");
        setOpen(false);
        onSuccess?.();
        onClose?.();
      }
      lastOkRef.current = state.ok;
    }
  }, [state, onSuccess, onClose]);

  return (
    <>
      {/* FAB: solo en mobile, hidden en md+ */}
      <div className="md:hidden fixed bottom-6 right-6 z-30">
        <Button
          type="button"
          onClick={() => setOpen(true)}
          size="icon"
          className="size-14 rounded-full shadow-lg bg-sky-600 hover:bg-sky-700 text-white"
          aria-label="Nuevo gasto"
        >
          <Plus className="size-6" />
        </Button>
      </div>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-h-[90vh] overflow-y-auto bg-background rounded-t-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Nuevo gasto</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon" className="min-h-11 min-w-11"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </Button>
            </div>
            <FormContent proveedores={proveedores} action={action} pending={pending} />
          </div>
        </div>
      )}

      {/* Desktop: form embebido en columna derecha */}
      <div className="hidden md:block">
        <FormContent proveedores={proveedores} action={action} pending={pending} />
      </div>
    </>
  );
}

function FormContent({
  proveedores,
  action,
  pending,
}: {
  proveedores: Proveedor[];
  action: (formData: FormData) => void;
  pending: boolean;
}) {
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
