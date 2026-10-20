"use client";

import { Field } from "@/components/filtros/filtros-bar";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/filtros/multi-select";
import { Layers } from "lucide-react";

const TIPOS = [
  { value: "ARRIENDO", label: "Arriendo" },
  { value: "NOMINA", label: "Nómina" },
  { value: "SERVICIOS", label: "Servicios" },
  { value: "IMPUESTOS", label: "Impuestos" },
  { value: "PRESTAMO", label: "Préstamo" },
  { value: "RETIRO_PERSONAL", label: "Retiro personal" },
  { value: "OTRO", label: "Otro" },
] as const;

const SALE_DE = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "CAJA", label: "Caja" },
] as const;

type SaleDe = (typeof SALE_DE)[number]["value"];

export function RetirosFiltrosExtra({
  tiposSeleccionados,
  onTiposChange,
  saleDeSeleccionados,
  onSaleDeChange,
  q,
  onQChange,
  agruparPorMes,
  onAgruparChange,
}: {
  tiposSeleccionados: string[];
  onTiposChange: (next: string[]) => void;
  saleDeSeleccionados: SaleDe[];
  onSaleDeChange: (next: SaleDe[]) => void;
  q: string;
  onQChange: (next: string) => void;
  agruparPorMes: boolean;
  onAgruparChange: (next: boolean) => void;
}) {
  return (
    <>
      <Field label="Tipo" className="min-w-[140px] md:min-w-[180px] md:max-w-[220px]">
        <MultiSelect
          name="tipo"
          options={TIPOS.map((t) => ({ value: t.value, label: t.label }))}
          value={tiposSeleccionados}
          onChange={onTiposChange}
          emptyLabel="Todos los tipos"
        />
      </Field>

      <Field label="Sale de" className="min-w-[140px] md:min-w-[160px] md:max-w-[200px]">
        <MultiSelect
          name="saleDe"
          options={SALE_DE.map((s) => ({ value: s.value, label: s.label }))}
          value={saleDeSeleccionados}
          onChange={(v) => onSaleDeChange(v as SaleDe[])}
          emptyLabel="Cualquiera"
        />
      </Field>

      <Field label="Buscar" className="min-w-[160px] md:min-w-[200px] md:max-w-[260px]">
        <Input
          name="q"
          placeholder="motivo o nota…"
          defaultValue={q}
          onChange={(e) => onQChange(e.target.value)}
          className="w-full"
        />
      </Field>

      <Field label="Agrupar">
        <label
          htmlFor="filtros-agrupar"
          className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm transition-colors hover:bg-muted/50 has-[input:checked]:bg-primary has-[input:checked]:text-primary-foreground has-[input:checked]:border-primary dark:bg-input/30 dark:hover:bg-input/50"
        >
          <input
            type="checkbox"
            id="filtros-agrupar"
            name="agrupar"
            value="1"
            checked={agruparPorMes}
            onChange={(e) => onAgruparChange(e.target.checked)}
            className="sr-only"
          />
          <Layers className="size-3.5" />
          Por mes
        </label>
      </Field>
    </>
  );
}
