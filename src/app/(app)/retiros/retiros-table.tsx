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
import { Button } from "@/components/ui/button";
import { formatCOP, formatShortDate } from "@/lib/format";
import { diaSemana } from "@/lib/dates";
import { Trash2 } from "lucide-react";
import {
  eliminarRetiroAction,
  restaurarRetiroAction,
  type RetiroState,
} from "@/server/actions/retiros";
import { ConfirmDialog } from "@/components/confirm-dialog";

type RetiroView = {
  id: string;
  fecha: string;
  concepto: string;
  valor: number;
  saleDe: "EFECTIVO" | "NEQUI" | "CAJA";
};

export function RetirosTable({ retiros }: { retiros: RetiroView[] }) {
  if (retiros.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No hay retiros en este periodo.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Concepto</TableHead>
          <TableHead>Sale de</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {retiros.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <div className="text-sm">{diaSemana(new Date(r.fecha))}</div>
              <div className="text-xs text-muted-foreground">
                {formatShortDate(new Date(r.fecha))}
              </div>
            </TableCell>
            <TableCell className="font-medium">{r.concepto}</TableCell>
            <TableCell>
              <Badge variant="outline" className="font-normal">
                {r.saleDe}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums font-semibold">
              {formatCOP(r.valor)}
            </TableCell>
            <TableCell>
              <DeleteRetiroButton id={r.id} concepto={r.concepto} valor={r.valor} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DeleteRetiroButton({
  id,
  concepto,
  valor,
}: {
  id: string;
  concepto: string;
  valor: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    const fd = new FormData();
    fd.append("id", id);
    startTransition(async () => {
      const result: RetiroState & { snapshot?: unknown } = await eliminarRetiroAction(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const snap = result.snapshot as
        | { concepto: string; valor: number; id: string }
        | undefined;
      if (!snap) {
        toast.success("Retiro eliminado");
        return;
      }
      toast("Retiro eliminado", {
        description: `${snap.concepto} · ${formatCOP(snap.valor)}`,
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
            ¿Eliminar el retiro <strong>{concepto}</strong> por{" "}
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
