"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  crearCierreVacioAction,
  type CrearCierreState,
} from "@/server/actions/cierre";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toISODateLocal } from "@/lib/dates";
import { useIrAlPeriodo } from "@/components/filtros/ir-al-periodo";

const INITIAL: CrearCierreState = { ok: true, ts: 0 };

export function CrearCierreForm({
  fechaInicial,
  desde,
  hasta,
  onClose,
  onSuccess,
}: {
  /**
   * Fecha por defecto ('YYYY-MM-DD'). La page la calcula con el período que
   * el usuario está viendo: si está viendo un mes pasado, el formulario se
   * abre con el último día de ese mes. Sin este prop se usa hoy.
   */
  fechaInicial?: string;
  /**
   * Período que el usuario está viendo. Si el cierre se guarda FUERA de ese
   * período, la app navega al mes del cierre para que el registro nuevo se
   * vea de una vez.
   */
  desde?: Date;
  hasta?: Date;
  onClose?: () => void;
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState(
    crearCierreVacioAction,
    INITIAL,
  );
  const lastTs = useRef(0);
  // Fecha con la que se guardó (la toma el input al enviar el formulario).
  const fechaGuardadaRef = useRef("");
  const irAlPeriodo = useIrAlPeriodo({ desde, hasta });

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) {
        toast.error(state.error);
      } else if (state.ok) {
        toast.success("Cierre creado. Editá sus valores abajo.");
        onSuccess?.();
        onClose?.();
        // Solo navega si la fecha quedó fuera del período visible.
        irAlPeriodo(fechaGuardadaRef.current);
      }
    }
  }, [state, onSuccess, onClose, irAlPeriodo]);

  const today = toISODateLocal(new Date());

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        fechaGuardadaRef.current = fd.get("fecha")?.toString() ?? "";
      }}
      className="flex items-end gap-3 flex-wrap"
    >
      <div className="space-y-1.5 flex-1 min-w-[200px]">
        <Label htmlFor="fecha">Fecha</Label>
        <Input
          id="fecha"
          name="fecha"
          type="date"
          max={today}
          defaultValue={fechaInicial ?? today}
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" />
        {pending ? "Creando…" : "Crear cierre"}
      </Button>
    </form>
  );
}
