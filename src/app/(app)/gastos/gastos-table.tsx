"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronDown, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

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

/** Un día del accordion: los gastos de esa fecha y su total. */
type GrupoDia = {
  /** Clave del día: "YYYY-MM-DD". */
  key: string;
  fecha: Date;
  items: GastoView[];
  total: number;
};

/** Un mes (solo se usa en el modo "agrupar por mes"). */
type GrupoMes = {
  /** Clave del mes: "YYYY-MM". */
  key: string;
  label: string;
  items: GastoView[];
  total: number;
};

/**
 * Agrupa los gastos por día.
 *
 * Los gastos llegan ordenados por fecha descendente, así que el primer grupo
 * es el día más reciente.
 */
function agruparGastosPorDia(gastos: GastoView[]): GrupoDia[] {
  const mapa = new Map<string, GastoView[]>();
  for (const g of gastos) {
    // `fecha` viene como YYYY-MM-DD; los primeros 10 chars son el día.
    const key = g.fecha.slice(0, 10);
    const items = mapa.get(key);
    if (items) items.push(g);
    else mapa.set(key, [g]);
  }

  return Array.from(mapa, ([key, items]) => ({
    key,
    fecha: new Date(`${key}T00:00:00.000Z`),
    items,
    total: items.reduce((s, g) => s + g.valor, 0),
  }));
}

/** Agrupa los gastos por mes (modo "agrupar por mes"). */
function agruparGastosPorMes(gastos: GastoView[]): GrupoMes[] {
  const mapa = new Map<string, GastoView[]>();
  for (const g of gastos) {
    const key = g.fecha.slice(0, 7); // "YYYY-MM"
    const items = mapa.get(key);
    if (items) items.push(g);
    else mapa.set(key, [g]);
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

  return Array.from(mapa.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // más reciente arriba
    .map(([key, items]) => {
      const [y, m] = key.split("-").map(Number);
      return {
        key,
        label: `${MESES_LARGO[m - 1]} ${y}`,
        items,
        total: items.reduce((s, g) => s + g.valor, 0),
      };
    });
}

/**
 * Accordion por día: una cabecera por día (fecha, cantidad de gastos y total)
 * que al desplegar muestra los gastos de ese día.
 *
 * Por defecto queda abierto solo el día más reciente; el resto, cerrado. Cada
 * clic del usuario se guarda como una decisión explícita para ese día.
 */
function AcordeonPorDia({
  dias,
  diaAbiertoPorDefecto,
}: {
  dias: GrupoDia[];
  diaAbiertoPorDefecto?: string;
}) {
  const [decisiones, setDecisiones] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-2">
      {dias.map((dia) => {
        const abierto =
          decisiones[dia.key] ?? dia.key === diaAbiertoPorDefecto;
        const panelId = `gastos-panel-${dia.key}`;

        return (
          <div
            key={dia.key}
            className="overflow-hidden rounded-lg border border-border"
          >
            <button
              type="button"
              aria-expanded={abierto}
              aria-controls={panelId}
              onClick={() =>
                setDecisiones((d) => ({ ...d, [dia.key]: !abierto }))
              }
              className="flex w-full items-center justify-between gap-3 bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted/70"
            >
              <span className="flex min-w-0 items-center gap-2">
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    !abierto && "-rotate-90",
                  )}
                />
                <span className="truncate text-sm font-medium">
                  {diaSemana(dia.fecha)}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {formatShortDate(dia.fecha)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {dia.items.length}{" "}
                  {dia.items.length === 1 ? "gasto" : "gastos"}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCOP(dia.total)}
                </span>
              </span>
            </button>

            <div id={panelId} hidden={!abierto} className="border-t border-border">
              <TablaGastos items={dia.items} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Filas de los gastos de un día.
 *
 * Reusa `ResponsiveTable` para que en mobile se vean como tarjetas igual que
 * antes, y para no tener dos tablas distintas que mantener.
 */
function TablaGastos({ items }: { items: GastoView[] }) {
  return (
    <ResponsiveTable
      rows={items}
      rowKey={(g) => g.id}
      emptyMessage=""
      columns={[
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
            <span className="tabular-nums font-semibold">
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
              <span className="text-sm text-muted-foreground">{g.nota}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
        {
          key: "acciones",
          header: "",
          align: "right",
          cell: (g) => (
            <DeleteGastoButton id={g.id} proveedor={g.proveedor} valor={g.valor} />
          ),
        },
      ]}
      fields={[
        {
          key: "proveedor",
          label: "Proveedor",
          render: (g) => (
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
          key: "acciones",
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

export function GastosTable({
  gastos,
  agruparPorMes = false,
}: {
  gastos: GastoView[];
  agruparPorMes?: boolean;
}) {
  const dias = agruparGastosPorDia(gastos);
  const meses = agruparGastosPorMes(gastos);
  // El día más reciente de toda la lista es el que queda abierto.
  const diaAbiertoPorDefecto = dias[0]?.key;

  return (
    <div data-slot="gastos-acordeon" className="space-y-2">
      {gastos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay gastos en este periodo.
        </p>
      ) : agruparPorMes ? (
        <div className="space-y-6">
          {meses.map((mes) => (
            <section key={mes.key} className="space-y-2">
              <header className="flex items-baseline justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {mes.label}
                </h3>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCOP(mes.total)}
                </span>
              </header>
              <AcordeonPorDia
                dias={agruparGastosPorDia(mes.items)}
                diaAbiertoPorDefecto={diaAbiertoPorDefecto}
              />
            </section>
          ))}
        </div>
      ) : (
        <AcordeonPorDia dias={dias} diaAbiertoPorDefecto={diaAbiertoPorDefecto} />
      )}
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
