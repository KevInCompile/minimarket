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
import { toISODate } from "@/lib/dates";

const INITIAL: CrearCierreState = { ok: true, ts: 0 };

export function CrearCierreForm() {
  const [state, action, pending] = useActionState(
    crearCierreVacioAction,
    INITIAL,
  );
  const lastTs = useRef(0);

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) toast.error(state.error);
      if (state.ok) toast.success("Cierre creado. Editá sus valores abajo.");
    }
  }, [state]);

  const today = toISODate(new Date());

  return (
    <form action={action} className="flex items-end gap-3 flex-wrap">
      <div className="space-y-1.5 flex-1 min-w-[200px]">
        <Label htmlFor="fecha">Fecha</Label>
        <Input
          id="fecha"
          name="fecha"
          type="date"
          max={today}
          defaultValue={today}
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
