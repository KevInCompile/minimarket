"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearPrestamoAction, type PrestamoState } from "@/server/actions/prestamos";
import { toISODateLocal } from "@/lib/dates";

const INITIAL: PrestamoState = { ok: true, ts: 0 };

/**
 * Alta de un préstamo.
 *
 * El formulario no decide nada: la validación vive en
 * `src/lib/prestamos.ts` (que es testeada) y la action devuelve el error
 * con el campo al que apunta.
 */
export function PrestamoForm({
  onClose,
  onSuccess,
}: {
  onClose?: () => void;
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState(crearPrestamoAction, INITIAL);
  const lastTs = useRef(0);
  const hoy = toISODateLocal(new Date());

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) {
        toast.error(state.error);
      } else if (state.ok) {
        toast.success("Préstamo registrado");
        onSuccess?.();
        onClose?.();
      }
    }
  }, [state, onSuccess, onClose]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fecha">Fecha del préstamo</Label>
        <Input id="fecha" name="fecha" type="date" max={hoy} defaultValue={hoy} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="persona">A quién se le prestó</Label>
        <Input
          id="persona"
          name="persona"
          placeholder="Nombre de quien pidió la plata"
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="valor">Valor</Label>
        <Input
          id="valor"
          name="valor"
          inputMode="numeric"
          placeholder="0"
          className="tabular-nums"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nota">Nota (opcional)</Label>
        <Input
          id="nota"
          name="nota"
          placeholder="Motivo, cómo se devuelve, etc."
          maxLength={500}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Los préstamos son un registro de control: no suman ni restan en el
        balance.
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Registrar préstamo"}
        </Button>
      </div>
    </form>
  );
}
