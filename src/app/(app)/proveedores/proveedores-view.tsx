"use client";

import { useState } from "react";
import { Truck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProveedorForm, ProveedorList } from "./proveedor-form";

type ProveedorView = {
  id: string;
  nombre: string;
  activo: boolean;
  cantidadGastos: number;
};

export function ProveedoresView({ proveedores }: { proveedores: ProveedorView[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="size-7 text-orange-600 dark:text-orange-400" />
            Proveedores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {proveedores.length} proveedores · {proveedores.filter((p) => p.activo).length} activos
          </p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="hidden md:inline-flex h-9 px-4 py-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" />
            Nuevo proveedor
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl p-0 gap-0"
          >
            <SheetHeader className="px-6 py-4 border-b bg-orange-50/50 dark:bg-orange-950/20">
              <SheetTitle>Nuevo proveedor</SheetTitle>
              <SheetDescription>
                Se autocompleta al registrar gastos.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ProveedorForm
                onClose={() => setOpen(false)}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <ProveedorList proveedores={proveedores} />

      <div className="md:hidden fixed bottom-6 right-6 z-30">
        <Button
          type="button"
          onClick={() => setOpen(true)}
          size="icon"
          className="size-14 rounded-full shadow-lg bg-orange-600 hover:bg-orange-700 text-white"
          aria-label="Nuevo proveedor"
        >
          <Plus className="size-6" />
        </Button>
      </div>
    </div>
  );
}
