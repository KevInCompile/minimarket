"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatCOP, formatShortDate } from "@/lib/format";
import { diaSemana } from "@/lib/dates";
import {
  eliminarRetiroAction,
  restaurarRetiroAction,
  type RetiroState,
} from "@/server/actions/retiros";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ResponsiveTable } from "@/components/responsive-table";

type RetiroView = {
  id: string;
  fecha: string;
  tipo: "ARRIENDO" | "NOMINA" | "SERVICIOS" | "IMPUESTOS" | "PRESTAMO" | "RETIRO_PERSONAL" | "OTRO";
  concepto: string;
  valor: number;
  saleDe: "EFECTIVO" | "NEQUI" | "CAJA";
  nota: string | null;
};

const TIPO_LABEL: Record<RetiroView["tipo"], string> = {
  ARRIENDO: "Arriendo",
  NOMINA: "Nómina",
  SERVICIOS: "Servicios",
  IMPUESTOS: "Impuestos",
  PRESTAMO: "Préstamo",
  RETIRO_PERSONAL: "Retiro personal",
  OTRO: "Otro",
};

const TIPO_VARIANT: Record<
  RetiroView["tipo"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  ARRIENDO: "default",
  NOMINA: "default",
  SERVICIOS: "secondary",
  IMPUESTOS: "secondary",
  PRESTAMO: "destructive",
  RETIRO_PERSONAL: "outline",
  OTRO: "outline",
};

export function RetirosTable({ retiros }: { retiros: RetiroView[] }) {
  return (
    <ResponsiveTable
      rows={retiros}
      rowKey={(r) => r.id}
      emptyMessage="No hay retiros en este periodo."
      columns={[
        {
          key: "fecha",
          header: "Fecha",
          cell: (r) => (
            <div>
              <div className="text-sm">{diaSemana(new Date(r.fecha))}</div>
              <div className="text-xs text-muted-foreground">
                {formatShortDate(new Date(r.fecha))}
              </div>
            </div>
          ),
        },
        {
          key: "tipo",
          header: "Tipo",
          cell: (r) => (
            <Badge variant={TIPO_VARIANT[r.tipo]} className="font-normal">
              {TIPO_LABEL[r.tipo]}
            </Badge>
          ),
        },
        {
          key: "concepto",
          header: "Motivo",
          cell: (r) => (
            <div>
              <div className="font-medium">{r.concepto}</div>
              {r.nota && (
                <div className="text-xs text-muted-foreground">{r.nota}</div>
              )}
            </div>
          ),
        },
        {
          key: "saleDe",
          header: "Sale de",
          cell: (r) => (
            <Badge variant="outline" className="font-normal">
              {r.saleDe}
            </Badge>
          ),
        },
        {
          key: "valor",
          header: "Valor",
          align: "right",
          cell: (r) => (
            <span className="tabular-nums font-semibold">
              {formatCOP(r.valor)}
            </span>
          ),
        },
        {
          key: "actions",
          header: "",
          align: "right",
          cell: (r) => (
            <DeleteRetiroButton
              id={r.id}
              tipo={TIPO_LABEL[r.tipo]}
              concepto={r.concepto}
              valor={r.valor}
            />
          ),
        },
      ]}
      fields={[
        {
          key: "fecha",
          label: "Tipo",
          render: (r) => (
            <div className="text-right">
              <div>{diaSemana(new Date(r.fecha))}</div>
              <div className="text-xs text-muted-foreground">
                {formatShortDate(new Date(r.fecha))}
              </div>
            </div>
          ),
        },
        {
          key: "tipo",
          label: "Tipo",
          render: (r) => (
            <Badge variant={TIPO_VARIANT[r.tipo]} className="font-normal">
              {TIPO_LABEL[r.tipo]}
            </Badge>
          ),
        },
        {
          key: "concepto",
          label: "Motivo",
          render: (r) => (
            <div className="text-right">
              <div className="font-medium">{r.concepto}</div>
              {r.nota && (
                <div className="text-xs text-muted-foreground">{r.nota}</div>
              )}
            </div>
          ),
        },
        {
          key: "saleDe",
          label: "Sale de",
          render: (r) => (
            <Badge variant="outline" className="font-normal">
              {r.saleDe}
            </Badge>
          ),
        },
        {
          key: "valor",
          label: "Valor",
          render: (r) => (
            <span className="tabular-nums font-semibold">
              {formatCOP(r.valor)}
            </span>
          ),
          fullWidth: true,
        },
        {
          key: "actions",
          label: "",
          render: (r) => (
            <div className="flex justify-end">
              <DeleteRetiroButton
                id={r.id}
                tipo={TIPO_LABEL[r.tipo]}
                concepto={r.concepto}
                valor={r.valor}
              />
            </div>
          ),
        },
      ]}
    />
  );
}

function DeleteRetiroButton({
  id,
  tipo,
  concepto,
  valor,
}: {
  id: string;
  tipo: string;
  concepto: string;
  valor: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    const fd = new FormData();
    fd.append("id", id);
    startTransition(async () => {
      const result: RetiroState & { snapshot?: unknown } =
        await eliminarRetiroAction(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const snap = result.snapshot as
        | {
            tipo: string;
            concepto: string;
            valor: number;
            id: string;
          }
        | undefined;
      if (!snap) {
        toast.success("Retiro eliminado");
        return;
      }
      toast("Retiro eliminado", {
        description: `${snap.tipo} · ${snap.concepto} · ${formatCOP(snap.valor)}`,
        duration: 5000,
        action: {
          label: "Deshacer",
          onClick: () => {
            startTransition(async () => {
              await restaurarRetiroAction(snap as never);
              toast.success("Retiro restaurado");
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
        title="Eliminar retiro"
        description={
          <>
            ¿Eliminar el retiro de <strong>{tipo}</strong> · {concepto} por{" "}
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