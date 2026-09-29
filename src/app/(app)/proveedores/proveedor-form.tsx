"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import {
  crearProveedorAction,
  toggleProveedorAction,
  type ProveedorState,
} from "@/server/actions/proveedores";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
  if (proveedores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Sin proveedores todavía.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead className="text-right">Gastos</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {proveedores.map((p) => (
          <ProveedorRow key={p.id} p={p} />
        ))}
      </TableBody>
    </Table>
  );
}

function ProveedorRow({ p }: { p: ProveedorView }) {
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
    <TableRow className={p.activo ? undefined : "opacity-60"}>
      <TableCell className="font-medium">{p.nombre}</TableCell>
      <TableCell className="text-right tabular-nums">{p.cantidadGastos}</TableCell>
      <TableCell>
        {p.activo ? (
          <Badge variant="secondary" className="font-normal">activo</Badge>
        ) : (
          <Badge variant="outline" className="font-normal">inactivo</Badge>
        )}
      </TableCell>
      <TableCell>
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
      </TableCell>

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
    </TableRow>
  );
}
