"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCOP, formatShortDate } from "@/lib/format";
import { diaSemana } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  eliminarGastoAction,
  restaurarGastoAction,
  type GastoState,
} from "@/server/actions/gastos";
import { ConfirmDialog } from "@/components/confirm-dialog";

type GastoView = {
  id: string;
  fecha: string;
  proveedor: string;
  valor: number;
  pagadoCon: "CAJA" | "EFECTIVO";
  nota: string | null;
};

export function GastosTable({ gastos }: { gastos: GastoView[] }) {
  if (gastos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No hay gastos en este periodo.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {gastos.map((g) => (
          <TableRow key={g.id}>
            <TableCell>
              <div className="text-sm">{diaSemana(new Date(g.fecha))}</div>
              <div className="text-xs text-muted-foreground">
                {formatShortDate(new Date(g.fecha))}
              </div>
            </TableCell>
            <TableCell>
              <div className="font-medium">{g.proveedor}</div>
              {g.nota && (
                <div className="text-xs text-muted-foreground">{g.nota}</div>
              )}
            </TableCell>
            <TableCell>
              <Badge
                variant={g.pagadoCon === "CAJA" ? "secondary" : "outline"}
                className="font-normal"
              >
                {g.pagadoCon}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums font-semibold">
              {formatCOP(g.valor)}
            </TableCell>
            <TableCell>
              <DeleteGastoButton id={g.id} proveedor={g.proveedor} valor={g.valor} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DeleteGastoButton({
  id,
  proveedor,
  valor,
}: {
  id: string;
  proveedor: string;
  valor: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    const fd = new FormData();
    fd.append("id", id);
    startTransition(async () => {
      const result: GastoState & { snapshot?: unknown } = await eliminarGastoAction(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const snap = result.snapshot as
        | { fecha: string; proveedorNombre: string; valor: number; id: string }
        | undefined;
      if (!snap) {
        toast.success("Gasto eliminado");
        return;
      }
      toast("Gasto eliminado", {
        description: `${snap.proveedorNombre} · ${formatCOP(snap.valor)}`,
        duration: 5000,
        action: {
          label: "Deshacer",
          onClick: () => {
            startTransition(async () => {
              await restaurarGastoAction(snap as never);
              toast.success("Gasto restaurado");
            });
          },
        },
      });
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Eliminar"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Eliminar gasto"
        description={
          <>
            ¿Eliminar el gasto de <strong>{proveedor}</strong> por{" "}
            <strong>{formatCOP(valor)}</strong>? Podes deshacerlo durante 5
            segundos.
          </>
        }
        confirmLabel="Eliminar"
        variant="destructive"
        pending={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
