"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import {
  crearProveedorAction,
  toggleProveedorAction,
  type ProveedorState,
} from "@/server/actions/proveedores";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ResponsiveTable } from "@/components/responsive-table";

const INITIAL: ProveedorState = { ok: true, ts: 0 };

type ProveedorView = {
  id: string;
  nombre: string;
  activo: boolean;
  cantidadGastos: number;
};

export function ProveedorForm() {
  const [state, action, pending] = useActionState(crearProveedorAction, INITIAL);
  const lastTs = useRef(0);

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) toast.error(state.error);
      if (state.ok) toast.success("Proveedor creado");
    }
  }, [state]);

  return (
    <form action={action} className="flex gap-2">
      <div className="flex-1 space-y-1">
        <Label htmlFor="nombre" className="sr-only">Nombre</Label>
        <Input id="nombre" name="nombre" required placeholder="Nombre del proveedor" />
      </div>
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" />
        {pending ? "Creando…" : "Crear"}
      </Button>
    </form>
  );
}

export function ProveedorList({ proveedores }: { proveedores: ProveedorView[] }) {
  return (
    <ResponsiveTable
      rows={proveedores}
      rowKey={(p) => p.id}
      rowClassName={(p) => (p.activo ? undefined : "opacity-60")}
      emptyMessage="Sin proveedores todavía."
      columns={[
        {
          key: "nombre",
          header: "Nombre",
          cell: (p) => <span className="font-medium">{p.nombre}</span>,
        },
        {
          key: "gastos",
          header: "Gastos",
          align: "right",
          cell: (p) => (
            <span className="tabular-nums">{p.cantidadGastos}</span>
          ),
        },
        {
          key: "estado",
          header: "Estado",
          cell: (p) =>
            p.activo ? (
              <Badge variant="secondary" className="font-normal">activo</Badge>
            ) : (
              <Badge variant="outline" className="font-normal">inactivo</Badge>
            ),
        },
        {
          key: "actions",
          header: "",
          align: "right",
          cell: (p) => <ProveedorToggleButton p={p} />,
        },
      ]}
      fields={[
        {
          key: "nombre",
          label: "Nombre",
          render: (p) => <span className="font-medium">{p.nombre}</span>,
        },
        {
          key: "gastos",
          label: "Gastos",
          render: (p) => (
            <span className="tabular-nums">{p.cantidadGastos}</span>
          ),
        },
        {
          key: "estado",
          label: "Estado",
          render: (p) =>
            p.activo ? (
              <Badge variant="secondary" className="font-normal">activo</Badge>
            ) : (
              <Badge variant="outline" className="font-normal">inactivo</Badge>
            ),
        },
        {
          key: "actions",
          label: "",
          render: (p) => (
            <div className="flex justify-end">
              <ProveedorToggleButton p={p} />
            </div>
          ),
        },
      ]}
    />
  );
}

function ProveedorToggleButton({ p }: { p: ProveedorView }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const bloqueadoPorGastos = p.activo && p.cantidadGastos > 0;

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", p.id);
      await toggleProveedorAction(fd);
      toast.success(p.activo ? `${p.nombre} desactivado` : `${p.nombre} activado`);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={bloqueadoPorGastos}
        title={
          bloqueadoPorGastos
            ? `No se puede desactivar: tiene ${p.cantidadGastos} gasto(s) asociado(s)`
            : undefined
        }
      >
        {p.activo ? "Desactivar" : "Activar"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={p.activo ? `Desactivar ${p.nombre}` : `Activar ${p.nombre}`}
        description={
          p.activo
            ? "El proveedor no aparecerá en los selects de gastos, pero sus gastos existentes se mantienen."
            : "El proveedor volverá a estar disponible en los selects."
        }
        confirmLabel={p.activo ? "Desactivar" : "Activar"}
        onConfirm={handleConfirm}
        pending={pending}
      />
    </>
  );
}
