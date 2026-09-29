"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { crearRetiroAction, type RetiroState } from "@/server/actions/retiros";
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

const INITIAL: RetiroState = { ok: true, ts: 0 };

export function RetiroForm() {
  const [state, action, pending] = useActionState(crearRetiroAction, INITIAL);
  const lastTs = useRef(0);

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) toast.error(state.error);
      if (state.ok) toast.success("Retiro registrado");
    }
  }, [state]);

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
        <Label htmlFor="concepto">Concepto</Label>
        <Input
          id="concepto"
          name="concepto"
          required
          placeholder="Arriendo, Nómina…"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="valor">Valor (COP)</Label>
        <Input
          id="valor"
          name="valor"
          type="text"
          inputMode="numeric"
          required
          placeholder="900000"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saleDe">Sale de</Label>
        <Select name="saleDe" defaultValue="EFECTIVO">
          <SelectTrigger id="saleDe">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EFECTIVO">Efectivo guardado</SelectItem>
            <SelectItem value="NEQUI">Nequi</SelectItem>
            <SelectItem value="CAJA">Caja del día</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        <Plus className="size-4" />
        {pending ? "Guardando…" : "Registrar retiro"}
      </Button>
    </form>
  );
}
