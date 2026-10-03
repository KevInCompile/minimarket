"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatCOP, formatShortDate } from "@/lib/format";
import { diaSemana } from "@/lib/dates";
import {
  eliminarGastoAction,
  restaurarGastoAction,
  type GastoState,
} from "@/server/actions/gastos";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ResponsiveTable } from "@/components/responsive-table";

type GastoView = {
  id: string;
  fecha: string;
  proveedor: string;
  valor: number;
  pagadoCon: "CAJA" | "EFECTIVO";
  nota: string | null;
};

export function GastosTable({ gastos }: { gastos: GastoView[] }) {
  return (
    <ResponsiveTable
      rows={gastos}
      rowKey={(g) => g.id}
      emptyMessage="No hay gastos en este periodo."
      columns={[
        {
          key: "fecha",
          header: "Fecha",
          cell: (g) => (
            <div>
              <div className="text-sm">{diaSemana(new Date(g.fecha))}</div>
              <div className="text-xs text-muted-foreground">
                {formatShortDate(new Date(g.fecha))}
              </div>
            </div>
          ),
        },
        {
          key: "proveedor",
          header: "Proveedor",
          cell: (g) => (
            <div>
              <div className="font-medium">{g.proveedor}</div>
              {g.nota && (
                <div className="text-xs text-muted-foreground">{g.nota}</div>
              )}
            </div>
          ),
        },
        {
          key: "tipo",
          header: "Tipo",
          cell: (g) => (
            <Badge
              variant={g.pagadoCon === "CAJA" ? "secondary" : "outline"}
              className="font-normal"
            >
              {g.pagadoCon}
            </Badge>
          ),
        },
        {
          key: "valor",
          header: "Valor",
          align: "right",
          cell: (g) => (
            <span className="tabular-nums font-semibold">
              {formatCOP(g.valor)}
            </span>
          ),
        },
        {
          key: "actions",
          header: "",
          align: "right",
          cell: (g) => (
            <DeleteGastoButton
              id={g.id}
              proveedor={g.proveedor}
              valor={g.valor}
            />
          ),
        },
      ]}
      fields={[
        {
          key: "fecha",
          label: "Fecha",
          render: (g) => (
            <div className="text-right">
              <div>{diaSemana(new Date(g.fecha))}</div>
              <div className="text-xs text-muted-foreground">
                {formatShortDate(new Date(g.fecha))}
              </div>
            </div>
          ),
        },
        {
          key: "proveedor",
          label: "Proveedor",
          render: (g) => (
            <div className="text-right">
              <div className="font-medium">{g.proveedor}</div>
              {g.nota && (
                <div className="text-xs text-muted-foreground">{g.nota}</div>
              )}
            </div>
          ),
        },
        {
          key: "tipo",
          label: "Tipo",
          render: (g) => (
            <Badge
              variant={g.pagadoCon === "CAJA" ? "secondary" : "outline"}
              className="font-normal"
            >
              {g.pagadoCon}
            </Badge>
          ),
        },
        {
          key: "valor",
          label: "Valor",
          render: (g) => (
            <span className="tabular-nums font-semibold">
              {formatCOP(g.valor)}
            </span>
          ),
          fullWidth: true,
        },
        {
          key: "actions",
          label: "",
          render: (g) => (
            <div className="flex justify-end">
              <DeleteGastoButton
                id={g.id}
                proveedor={g.proveedor}
                valor={g.valor}
              />
            </div>
          ),
        },
      ]}
    />
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