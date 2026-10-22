"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import {
  ETIQUETA_PAGADO_CON,
  StatusBadge,
  tonoDePagadoCon,
} from "@/components/status-badge";

type GastoView = {
  id: string;
  fecha: string;
  proveedor: string;
  valor: number;
  pagadoCon: "CAJA" | "EFECTIVO" | "TRANSFERENCIA";
  nota: string | null;
};

/** Celda de la forma de pago: píldora con etiqueta en español y tono propio. */
function BadgePagadoCon({ pagadoCon }: { pagadoCon: GastoView["pagadoCon"] }) {
  return (
    <StatusBadge tono={tonoDePagadoCon(pagadoCon)}>
      {ETIQUETA_PAGADO_CON[pagadoCon]}
    </StatusBadge>
  );
}

export function GastosTable({
  gastos,
  agruparPorMes = false,
}: {
  gastos: GastoView[];
  agruparPorMes?: boolean;
}) {
  if (!agruparPorMes) {
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
          cell: (g) => <BadgePagadoCon pagadoCon={g.pagadoCon} />,
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
          render: (g) => <BadgePagadoCon pagadoCon={g.pagadoCon} />,
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

  // ---------------------------------------------------------------------
  // Modo agrupado: un bloque por mes, con subtotal visible.
  // ---------------------------------------------------------------------
  type Grupo = { key: string; label: string; items: GastoView[] };
  const grupos: Grupo[] = (() => {
    const map = new Map<string, GastoView[]>();
    for (const g of gastos) {
      // fecha viene como YYYY-MM-DD; usamos los primeros 7 chars para agrupar.
      const key = g.fecha.slice(0, 7); // "YYYY-MM"
      const arr = map.get(key) ?? [];
      arr.push(g);
      map.set(key, arr);
    }
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
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // más reciente arriba
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
        No hay gastos en este periodo.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {grupos.map((grupo) => {
        const subtotal = grupo.items.reduce((s, g) => s + g.valor, 0);
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
              rowKey={(g) => g.id}
              emptyMessage=""
              columns={[
                {
                  key: "fecha",
                  header: "Fecha",
                  cell: (g) => (
                    <div className="text-sm">
                      <div className="font-medium">
                        {formatShortDate(new Date(g.fecha + "T00:00:00.000Z"))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {diaSemana(new Date(g.fecha + "T00:00:00.000Z"))}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "proveedor",
                  header: "Proveedor",
                  cell: (g) => <span className="font-medium">{g.proveedor}</span>,
                },
                {
                  key: "tipo",
                  header: "Tipo",
                  cell: (g) => <BadgePagadoCon pagadoCon={g.pagadoCon} />,
                },
                {
                  key: "valor",
                  header: "Valor",
                  align: "right",
                  cell: (g) => (
                    <span className="font-medium tabular-nums">
                      {formatCOP(g.valor)}
                    </span>
                  ),
                },
                {
                  key: "nota",
                  header: "Nota",
                  hideOnMobile: true,
                  cell: (g) =>
                    g.nota ? (
                      <span className="text-sm text-muted-foreground">
                        {g.nota}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    ),
                },
                {
                  key: "acciones",
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
            />
          </section>
        );
      })}
    </div>
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