"use client";

import { useState } from "react";
import { Wallet, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RetirosTable } from "./retiros-table";
import { RetiroForm } from "./retiro-form";
import { MonthSelector, type MesOption } from "@/components/filtros/month-selector";
import { FiltrosBar } from "@/components/filtros/filtros-bar";
import { RetirosFiltrosExtra } from "./retiros-filtros-extra";

type RetiroView = {
  id: string;
  fecha: string;
  tipo:
    | "ARRIENDO"
    | "NOMINA"
    | "SERVICIOS"
    | "IMPUESTOS"
    | "PRESTAMO"
    | "RETIRO_PERSONAL"
    | "OTRO";
  concepto: string;
  valor: number;
  saleDe: "EFECTIVO" | "TRANSFERENCIA" | "CAJA";
  nota: string | null;
};

type FiltrosActivos = {
  desde: Date;
  hasta: Date;
  mes: string | null;
  tiposSeleccionados: string[];
  saleDeSeleccionados: ("EFECTIVO" | "TRANSFERENCIA" | "CAJA")[];
  q: string;
  agruparPorMes: boolean;
};

export function RetirosView({
  retiros,
  filtros,
  mesOptions,
}: {
  retiros: RetiroView[];
  filtros: FiltrosActivos;
  mesOptions: MesOption[];
}) {
  const [open, setOpen] = useState(false);

  const total = retiros.reduce((s, r) => s + r.valor, 0);
  const porSaleDe = {
    EFECTIVO: retiros
      .filter((r) => r.saleDe === "EFECTIVO")
      .reduce((s, r) => s + r.valor, 0),
    TRANSFERENCIA: retiros
      .filter((r) => r.saleDe === "TRANSFERENCIA")
      .reduce((s, r) => s + r.valor, 0),
    CAJA: retiros
      .filter((r) => r.saleDe === "CAJA")
      .reduce((s, r) => s + r.valor, 0),
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="size-7 text-rose-600 dark:text-rose-400" />
            Retiros
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {retiros.length} retiros · Total{" "}
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
            Nuevo retiro
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl p-0 gap-0"
          >
            <SheetHeader className="px-6 py-4 border-b bg-rose-50/50 dark:bg-rose-950/20">
              <SheetTitle>Nuevo retiro</SheetTitle>
              <SheetDescription>
                Plata que sale del negocio y no es compra.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <RetiroForm
                onClose={() => setOpen(false)}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {retiros.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Descontado del efectivo acumulado"
            value={porSaleDe.EFECTIVO}
            color="border-sky-200 bg-linear-to-br from-sky-50 to-cyan-50/60 dark:border-sky-800 dark:from-sky-950/30 dark:to-cyan-950/30"
            iconColor="bg-linear-to-br from-sky-500 to-cyan-500 text-white"
          />
          <StatCard
            label="Descontado del saldo Transferencia"
            value={porSaleDe.TRANSFERENCIA}
            color="border-violet-200 bg-linear-to-br from-violet-50 to-fuchsia-50/60 dark:border-violet-800 dark:from-violet-950/30 dark:to-fuchsia-950/30"
            iconColor="bg-linear-to-br from-violet-500 to-fuchsia-500 text-white"
          />
          <StatCard
            label="Salido de la caja del día"
            value={porSaleDe.CAJA}
            color="border-sky-200 bg-linear-to-br from-sky-50 to-cyan-50/60 dark:border-sky-800 dark:from-sky-950/30 dark:to-cyan-950/30"
            iconColor="bg-linear-to-br from-sky-500 to-cyan-500 text-white"
          />
        </div>
      )}

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
          <RetirosFiltrosExtra
            tiposSeleccionados={filtros.tiposSeleccionados}
            saleDeSeleccionados={filtros.saleDeSeleccionados}
            q={filtros.q}
            agruparPorMes={filtros.agruparPorMes}
          />
        </FiltrosBar>
      </div>

      <RetirosTable
        retiros={retiros.map((r) => ({
          id: r.id,
          fecha: r.fecha,
          tipo: r.tipo,
          concepto: r.concepto,
          valor: r.valor,
          saleDe: r.saleDe,
          nota: r.nota,
        }))}
        agruparPorMes={filtros.agruparPorMes}
      />

      {/* FAB para mobile */}
      <div className="md:hidden fixed bottom-6 right-6 z-30">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Nuevo retiro"
          className="size-14 rounded-full shadow-lg bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center min-h-11 min-w-11"
        >
          <Plus className="size-6" />
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  iconColor,
}: {
  label: string;
  value: number;
  color: string;
  iconColor: string;
}) {
  return (
    <div className={`rounded-lg p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
          {label}
        </span>
        <div
          className={`size-8 rounded-lg ${iconColor} flex items-center justify-center`}
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="2" />
            <path d="M6 12h.01M18 12h.01" />
          </svg>
        </div>
      </div>
      <div className="text-xl font-bold tabular-nums">
        {value === 0 ? (
          <span className="text-muted-foreground text-base">$ 0</span>
        ) : (
          value.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
          })
        )}
      </div>
    </div>
  );
}
