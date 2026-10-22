"use client";

import { useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CrearCierreForm } from "./crear-cierre-form";
import { CierreCards } from "./cierre-cards";
import { CierreFilters } from "./cierre-filters";
import { ResumenPeriodo } from "./resumen-periodo";
import { PageToolbar } from "@/components/page-toolbar";
import type { MesOption } from "@/components/filtros/month-selector";
import type { CierreDiarioComputed } from "@/lib/calc";

type Pendiente = string;

export function CierreView({
  serie,
  pendientes,
  desde,
  hasta,
  mes,
  mesOptions,
}: {
  serie: CierreDiarioComputed[];
  pendientes: Pendiente[];
  desde: Date;
  hasta: Date;
  mes: string | null;
  mesOptions: MesOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Cierre diario"
        icon={ClipboardCheck}
        iconClassName="text-sky-600 dark:text-sky-400"
        subtitle={`${serie.length} días`}
        actions={
          /* Desktop: botón en el toolbar que abre un panel lateral */
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="hidden md:inline-flex h-9 px-4 py-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="size-4" />
              Crear cierre
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:max-w-xl p-0 gap-0"
            >
              <SheetHeader className="px-6 py-4 border-b bg-sky-50/50 dark:bg-sky-950/20">
                <SheetTitle>Crear cierre</SheetTitle>
                <SheetDescription>
                  Útil si quiere registrar un día festivo o con caja inicial $0
                  antes de que lleguen los gastos.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <CrearCierreForm
                  onClose={() => setOpen(false)}
                  onSuccess={() => setOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
        }
      >
        <CierreFilters
          desde={desde}
          hasta={hasta}
          mes={mes}
          mesOptions={mesOptions}
        />
      </PageToolbar>

      <ResumenPeriodo serie={serie} />

      <CierreCards
        rows={serie.map((s) => ({
          fecha: s.fecha.toISOString(),
          cajaApertura: s.cajaApertura,
          cajaCierre: s.cajaCierre,
          efectivoGuardado: s.efectivoGuardado,
          efectivoRealContado: s.efectivoRealContado,
          gastosCaja: s.gastosCaja,
          gastosEfectivo: s.gastosEfectivo,
          gastosTransferencia: s.gastosTransferencia,
          totalGastos: s.totalGastos,
          entradaEstimada: s.entradaEstimada,
          retirosEfectivo: s.retirosEfectivo,
          retirosTransferencia: s.retirosTransferencia,
          transferenciaDia: s.transferenciaDia,
          efectivoAcumulado: s.efectivoAcumulado,
          transferenciaAcumulado: s.transferenciaAcumulado,
          descuadre: s.descuadre,
          totalVentaDelDia: s.totalVentaDelDia,
        }))}
        pendientes={pendientes}
      />

      <div className="md:hidden fixed bottom-6 right-6 z-30">
        <Button
          type="button"
          onClick={() => setOpen(true)}
          size="icon"
          className="size-14 rounded-full shadow-lg bg-sky-600 hover:bg-sky-700 text-white"
          aria-label="Crear cierre"
        >
          <Plus className="size-6" />
        </Button>
      </div>
    </div>
  );
}
