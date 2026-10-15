"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { guardarTransferenciaAction, type TransferenciaState } from "@/server/actions/transferencia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

const INITIAL: TransferenciaState = { ok: true, ts: 0 };

export function TransferenciaRow({
  fecha,
  initialTotal,
}: {
  fecha: string;
  initialTotal: number;
}) {
  const [state, action, pending] = useActionState(guardarTransferenciaAction, INITIAL);
  const lastTs = useRef(0);

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) toast.error(state.error);
      if (state.ok) toast.success("Transferencia guardado");
    }
  }, [state]);

  return (
    <form action={action} className="flex items-end gap-2">
      <input type="hidden" name="fecha" value={fecha} />
      <div className="flex-1 space-y-1">
        <Label htmlFor={`total-${fecha}`} className="text-xs">
          Total recibido
        </Label>
        <Input
          id={`total-${fecha}`}
          name="total"
          type="text"
          inputMode="numeric"
          defaultValue={initialTotal || ""}
          key={`${fecha}-${initialTotal}`}
          placeholder="0"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        <Save />
        {pending ? "…" : "Guardar"}
      </Button>
    </form>
  );
}
