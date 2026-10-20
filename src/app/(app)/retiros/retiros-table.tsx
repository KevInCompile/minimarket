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
  saleDe: "EFECTIVO" | "TRANSFERENCIA" | "CAJA";
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

export function RetirosTable({
  retiros,
  agruparPorMes = false,
}: {
  retiros: RetiroView[];
  agruparPorMes?: boolean;
}) {
  if (!agruparPorMes) {
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

  // ---------------------------------------------------------------------
  // Modo agrupado: un bloque por mes con subtotal.
  // ---------------------------------------------------------------------
  type Grupo = { key: string; label: string; items: RetiroView[] };
  const MESES_LARGO = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const grupos: Grupo[] = (() => {
    const map = new Map<string, RetiroView[]>();
    for (const r of retiros) {
      const key = (typeof r.fecha === "string" ? r.fecha : new Date(r.fecha).toISOString()).slice(0, 7);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => {
        const [y, m] = key.split("-").map(Number);
        return {
          key,
          label: `${MESES_LARGO[m - 1]} ${y}`,
          items,
        };
      });
  })();

  if (grupos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No hay retiros en este periodo.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {grupos.map((grupo) => {
        const subtotal = grupo.items.reduce((s, r) => s + r.valor, 0);
        return (
          <section key={grupo.key} className="space-y-2">
            <header className="flex items-baseline justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {grupo.label}
              </h3>
              <span className="text-sm font-semibold tabular-nums">
                {subtotal.toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                })}
              </span>
            </header>
            <ResponsiveTable
              rows={grupo.items}
              rowKey={(r) => r.id}
              emptyMessage=""
              columns={[
                {
                  key: "fecha",
                  header: "Fecha",
                  cell: (r) => (
                    <div className="text-sm">
                      <div className="font-medium">
                        {formatShortDate(
                          new Date(
                            typeof r.fecha === "string"
                              ? r.fecha
                              : new Date(r.fecha),
                          ),
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {diaSemana(
                          new Date(
                            typeof r.fecha === "string"
                              ? r.fecha
                              : new Date(r.fecha),
                          ),
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "tipo",
                  header: "Tipo",
                  cell: (r) => <Badge variant="outline">{r.tipo}</Badge>,
                },
                {
                  key: "concepto",
                  header: "Concepto",
                  cell: (r) => <span className="font-medium">{r.concepto}</span>,
                },
                {
                  key: "saleDe",
                  header: "Sale de",
                  hideOnMobile: true,
                  cell: (r) => <Badge variant="secondary">{r.saleDe}</Badge>,
                },
                {
                  key: "valor",
                  header: "Valor",
                  align: "right",
                  cell: (r) => (
                    <span className="font-medium tabular-nums">
                      {formatCOP(r.valor)}
                    </span>
                  ),
                },
                {
                  key: "acciones",
                  header: "",
                  align: "right",
                  cell: (r) => (
                    <DeleteRetiroButton
                      id={r.id}
                      tipo={r.tipo}
                      concepto={r.concepto}
                      valor={r.valor}
                    />
                  ),
                },
              ]}
            />
          </section>
        );
      })}
    </div>
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
        size="icon"
        className="min-h-11 min-w-11 text-muted-foreground hover:text-destructive"
        title="Eliminar"
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