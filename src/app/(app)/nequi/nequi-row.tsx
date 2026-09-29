"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { guardarNequiAction, type NequiState } from "@/server/actions/nequi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

const INITIAL: NequiState = { ok: true, ts: 0 };

export function NequiRow({
  fecha,
  initialTotal,
}: {
  fecha: string;
  initialTotal: number;
}) {
  const [state, action, pending] = useActionState(guardarNequiAction, INITIAL);
  const lastTs = useRef(0);

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) toast.error(state.error);
      if (state.ok) toast.success("Nequi guardado");
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
