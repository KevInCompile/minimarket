"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { crearRetiroAction, type RetiroState } from "@/server/actions/retiros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toISODate } from "@/lib/dates";
import { Plus, AlertCircle } from "lucide-react";
import { formatCOP } from "@/lib/format";
import { useState } from "react";

const INITIAL: RetiroState = { ok: true, ts: 0 };

const TIPOS = [
  { value: "ARRIENDO", label: "Arriendo" },
  { value: "NOMINA", label: "Nómina" },
  { value: "SERVICIOS", label: "Servicios (luz, agua, internet)" },
  { value: "IMPUESTOS", label: "Impuestos" },
  { value: "PRESTAMO", label: "Préstamo" },
  { value: "RETIRO_PERSONAL", label: "Retiro personal" },
  { value: "OTRO", label: "Otro" },
] as const;

const SALE_DE = [
  {
    value: "EFECTIVO",
    label: "Efectivo guardado",
    desc: "Descuenta del efectivo acumulado.",
  },
  {
    value: "NEQUI",
    label: "Nequi",
    desc: "Descuenta del saldo Nequi.",
  },
  {
    value: "CAJA",
    label: "Caja del día",
    desc: "Sale de la plata que entra hoy.",
  },
] as const;

export function RetiroForm() {
  const [state, action, pending] = useActionState(crearRetiroAction, INITIAL);
  const lastTs = useRef(0);
  const [tipo, setTipo] = useState<string>("OTRO");
  const [valor, setValor] = useState("");
  const [saleDe, setSaleDe] = useState<string>("EFECTIVO");

  const handleTipo = (v: string | null) => setTipo(v ?? "OTRO");
  const handleSaleDe = (v: string | null) => setSaleDe(v ?? "EFECTIVO");

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) toast.error(state.error);
      if (state.ok) toast.success("Retiro registrado");
    }
  }, [state]);

  const valorNum = Number(valor.replace(/[^0-9]/g, "")) || 0;
  const saleDeInfo = SALE_DE.find((s) => s.value === saleDe);

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
        <Label htmlFor="tipo">Tipo</Label>
        <Select name="tipo" value={tipo} onValueChange={handleTipo}>
          <SelectTrigger id="tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="tipo" value={tipo} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="concepto">Motivo</Label>
        <Input
          id="concepto"
          name="concepto"
          required
          placeholder="Ej: Arriendo local, Nómina Juan..."
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
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="saleDe">Sale de</Label>
        <Select name="saleDe" value={saleDe} onValueChange={handleSaleDe}>
          <SelectTrigger id="saleDe">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SALE_DE.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="saleDe" value={saleDe} />
        {saleDeInfo && (
          <p className="text-xs text-muted-foreground">{saleDeInfo.desc}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nota">Nota (opcional)</Label>
        <Textarea
          id="nota"
          name="nota"
          placeholder="Detalle, referencia, etc."
          rows={2}
        />
      </div>

      {valorNum > 0 && (
        <div className="rounded-md border border-rose-200 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-950/30 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-medium">
            <AlertCircle className="size-3.5" />
            Impacto en el acumulado
          </div>
          <p className="text-rose-700/90 dark:text-rose-400/90">
            Al guardar este retiro se descontarán{" "}
            <strong>{formatCOP(valorNum)}</strong> del total de{" "}
            <strong>
              {saleDe === "EFECTIVO"
                ? "efectivo acumulado"
                : saleDe === "NEQUI"
                  ? "saldo Nequi"
                  : "caja del día"}
            </strong>
            .
          </p>
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        <Plus className="size-4" />
        {pending ? "Guardando…" : "Registrar retiro"}
      </Button>
    </form>
  );
}