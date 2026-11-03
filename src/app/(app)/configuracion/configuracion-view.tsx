"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  guardarDiaCorteAction,
  type ConfiguracionState,
} from "@/server/actions/configuracion";

const INITIAL: ConfiguracionState = { ok: true, ts: 0 };

const DIAS = [
  { valor: 1, texto: "1 (mes calendario)" },
  { valor: 5, texto: "5" },
  { valor: 10, texto: "10" },
  { valor: 15, texto: "15" },
  { valor: 20, texto: "20" },
  { valor: 25, texto: "25" },
  { valor: 28, texto: "28" },
];

/**
 * Formulario del día de corte del período contable.
 *
 * El día de corte define cuándo se reinician los datos que se ven en el
 * balance. Con corte 15, el período va del 15 de un mes al 14 del siguiente.
 */
export function DiaCorteForm({ diaCorteActual }: { diaCorteActual: number }) {
  const [state, action, pending] = useActionState(
    guardarDiaCorteAction,
    INITIAL,
  );
  const lastTs = useRef(0);

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) toast.error(state.error);
      else if (state.ok) toast.success("Configuración guardada");
    }
  }, [state]);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2 min-w-[220px] flex-1">
        <Label htmlFor="diaCorte">Día de corte del período</Label>
        <Select name="diaCorte" defaultValue={String(diaCorteActual)}>
          <SelectTrigger id="diaCorte" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIAS.map((d) => (
              <SelectItem key={d.valor} value={String(d.valor)}>
                {d.texto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <CalendarClock className="size-3.5 mt-0.5 shrink-0" />
          El período va desde este día del mes hasta el día anterior del
          siguiente. Los datos guardados no se mueven: solo cambia por dónde
          se corta cada período.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
