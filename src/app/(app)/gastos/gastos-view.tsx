"use client";

import { useState } from "react";
import { Receipt, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GastosTable } from "./gastos-table";
import { GastoForm } from "./gasto-form";
import { MonthSelector, type MesOption } from "@/components/filtros/month-selector";
import { FiltrosBar } from "@/components/filtros/filtros-bar";
import { GastosFiltrosExtra } from "./gastos-filtros-extra";

type Proveedor = { id: string; nombre: string };
type PagadoCon = "CAJA" | "EFECTIVO" | "TRANSFERENCIA";
type GastoView = {
  id: string;
  fecha: string;
  proveedor: string;
  proveedorId: string;
  valor: number;
  pagadoCon: PagadoCon;
  nota: string | null;
};

type FiltrosActivos = {
  desde: Date;
  hasta: Date;
  mes: string | null;
  proveedoresSeleccionados: string[];
  pagadoConSeleccionados: string[];
  q: string;
  agruparPorMes: boolean;
};

export function GastosView({
  gastos,
  proveedores,
  filtros,
  mesOptions,
}: {
  gastos: GastoView[];
  proveedores: Proveedor[];
  filtros: FiltrosActivos;
  mesOptions: MesOption[];
}) {
  const [open, setOpen] = useState(false);

  const total = gastos.reduce((s, g) => s + g.valor, 0);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="size-7 text-amber-600 dark:text-amber-400" />
            Gastos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {gastos.length} gastos · Total{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {total.toLocaleString("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
              })}
            </span>
          </p>
        </div>
        {/* Botón desktop: solo visible en md+ */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="hidden md:inline-flex h-9 px-4 py-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" />
            Nuevo gasto
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl p-0 gap-0"
          >
            <SheetHeader className="px-6 py-4 border-b bg-amber-50/50 dark:bg-amber-950/20">
              <SheetTitle>Nuevo gasto</SheetTitle>
              <SheetDescription>
                Registre una compra de mercancía.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <GastoForm
                proveedores={proveedores}
                onClose={() => setOpen(false)}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Mes
            </label>
            <MonthSelector options={mesOptions} currentMes={filtros.mes} />
          </div>
        </div>
        <FiltrosBar
          desde={filtros.desde}
          hasta={filtros.hasta}
          mes={filtros.mes}
        >
          <GastosFiltrosExtra
            proveedores={proveedores}
            proveedoresSeleccionados={filtros.proveedoresSeleccionados}
            pagadoConSeleccionados={filtros.pagadoConSeleccionados as PagadoCon[]}
            q={filtros.q}
            agruparPorMes={filtros.agruparPorMes}
          />
        </FiltrosBar>
      </div>

      {/* Lista siempre visible */}
      <GastosTable
        gastos={gastos.map((g) => ({
          id: g.id,
          fecha: g.fecha,
          proveedor: g.proveedor,
          valor: g.valor,
          pagadoCon: g.pagadoCon,
          nota: g.nota,
        }))}
        agruparPorMes={filtros.agruparPorMes}
      />
    </div>
  );
}
