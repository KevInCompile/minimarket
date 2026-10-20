"use client";

import { useState, useEffect, useRef } from "react";
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

type FiltrosEfectivos = {
  desde: Date;
  hasta: Date;
  mes: string | null;
  proveedoresSeleccionados: string[];
  pagadoConSeleccionados: PagadoCon[];
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
  filtros: FiltrosEfectivos;
  mesOptions: MesOption[];
}) {
  const [open, setOpen] = useState(false);

  // Estado controlado para los filtros específicos, sincronizado por
  // las callbacks del FiltrosBar al cambiar el query string. Esto permite
  // que el MultiSelect, Input y checkbox reflejen cambios sincrónicos.
  //
  // La sincronización con la URL la hace el FiltrosBar al hacer submit.
  // Para los cambios *durante* el typing (no submit), guardamos el
  // estado local, y al submit se aplica a la URL.
  const [estadoFiltros, setEstadoFiltros] = useState(filtros);

  // Cuando el filtro efectivo cambia (post-navigation), sincronizamos.
  // Comparamos por JSON.stringify para ignorar cambios de identidad.
  const filtrosKey = JSON.stringify(filtros);
  const lastKeyRef = useRef(filtrosKey);
  useEffect(() => {
    if (lastKeyRef.current !== filtrosKey) {
      lastKeyRef.current = filtrosKey;
      setEstadoFiltros(filtros);
    }
  }, [filtrosKey, filtros]);

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

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 md:p-4 shadow-xs">
        <FiltrosBar
          desde={estadoFiltros.desde}
          hasta={estadoFiltros.hasta}
          mes={estadoFiltros.mes}
        >
          <GastosFiltrosExtra
            proveedores={proveedores}
            proveedoresSeleccionados={estadoFiltros.proveedoresSeleccionados}
            onProveedoresChange={(v) =>
              setEstadoFiltros((f) => ({ ...f, proveedoresSeleccionados: v }))
            }
            pagadoConSeleccionados={estadoFiltros.pagadoConSeleccionados}
            onPagadoConChange={(v) =>
              setEstadoFiltros((f) => ({ ...f, pagadoConSeleccionados: v }))
            }
            q={estadoFiltros.q}
            onQChange={(v) =>
              setEstadoFiltros((f) => ({ ...f, q: v }))
            }
            agruparPorMes={estadoFiltros.agruparPorMes}
            onAgruparChange={(v) =>
              setEstadoFiltros((f) => ({ ...f, agruparPorMes: v }))
            }
          />
        </FiltrosBar>

        <div className="flex items-end">
          <MonthSelector
            options={mesOptions}
            currentMes={estadoFiltros.mes}
          />
        </div>
      </div>

      <GastosTable
        gastos={gastos.map((g) => ({
          id: g.id,
          fecha: g.fecha,
          proveedor: g.proveedor,
          valor: g.valor,
          pagadoCon: g.pagadoCon,
          nota: g.nota,
        }))}
        agruparPorMes={estadoFiltros.agruparPorMes}
      />
    </div>
  );
}

/**
 * Sincroniza el estado local con los filtros efectivos solo cuando la
 * fuente de verdad cambia (post-navigation). Implementado en línea
 * arriba con useRef para evitar loops.
 */
