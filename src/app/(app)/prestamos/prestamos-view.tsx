"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, HandCoins, Plus, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ResponsiveTable } from "@/components/responsive-table";
import { StatusBadge, type EstadoTono } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatCOP, formatShortDate } from "@/lib/format";
import {
  OPCIONES_ESTADO,
  type EstadoFiltro,
  type PrestamoResumen,
} from "@/lib/prestamos";
import {
  alternarPagoPrestamoAction,
  eliminarPrestamoAction,
} from "@/server/actions/prestamos";
import { PrestamoForm } from "./prestamo-form";

type PrestamoView = PrestamoResumen;

type Totales = {
  total: number;
  pendiente: number;
  pagado: number;
  cantidad: number;
  cantidadPendientes: number;
  cantidadPagados: number;
};

/**
 * Vista de préstamos.
 *
 * Es un Client Component porque `ResponsiveTable` recibe callbacks
 * (`rowKey`, `cell`) que no pueden cruzar el límite Server → Client.
 * La page (server) carga los datos y los pasa como props serializables.
 */
export function PrestamosView({
  prestamos,
  estado,
  totales,
}: {
  prestamos: PrestamoView[];
  estado: EstadoFiltro;
  totales: Totales;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4 p-4 md:p-10">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <HandCoins className="size-7 text-emerald-600 dark:text-emerald-400" />
            Préstamos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totales.cantidad} préstamo{totales.cantidad === 1 ? "" : "s"} ·
            {totales.cantidadPendientes} pendiente
            {totales.cantidadPendientes === 1 ? "" : "s"} ·{" "}
            {totales.cantidadPagados} pagado
            {totales.cantidadPagados === 1 ? "" : "s"}. No suman en el balance.
          </p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="hidden md:inline-flex h-9 px-4 py-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" />
            Nuevo préstamo
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-xl p-0 gap-0">
            <SheetHeader className="px-6 py-4 border-b bg-emerald-50/50 dark:bg-emerald-950/20">
              <SheetTitle>Nuevo préstamo</SheetTitle>
              <SheetDescription>
                Registre la plata que se prestó. Queda pendiente hasta que la
                devuelvan.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <PrestamoForm
                onClose={() => setOpen(false)}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <FiltroEstado estado={estado} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TarjetaTotal
          titulo="Por cobrar"
          valor={totales.pendiente}
          detalle={`${totales.cantidadPendientes} pendiente${
            totales.cantidadPendientes === 1 ? "" : "s"
          }`}
        />
        <TarjetaTotal
          titulo="Devuelto"
          valor={totales.pagado}
          detalle={`${totales.cantidadPagados} pagado${
            totales.cantidadPagados === 1 ? "" : "s"
          }`}
        />
        <TarjetaTotal
          titulo="Total prestado"
          valor={totales.total}
          detalle={`${totales.cantidad} en la lista`}
        />
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Préstamos</CardTitle>
            <CardDescription>
              Los pendientes arriba. Marcá &quot;Pagado&quot; cuando la plata
              vuelva.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PrestamosTable prestamos={prestamos} />
        </CardContent>
      </Card>

      <div className="md:hidden fixed bottom-6 right-6 z-30">
        <Button
          type="button"
          onClick={() => setOpen(true)}
          size="icon"
          className="size-14 rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
          aria-label="Nuevo préstamo"
        >
          <Plus className="size-6" />
        </Button>
      </div>
    </div>
  );
}

/** Filtro por estado: vive en la URL para que la vista se pueda compartir. */
function FiltroEstado({ estado }: { estado: EstadoFiltro }) {
  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Filtrar préstamos">
      {OPCIONES_ESTADO.map((opcion) => {
        const activo = opcion.valor === estado;
        return (
          <Link
            key={opcion.valor}
            href={`/prestamos?estado=${opcion.valor}`}
            aria-current={activo ? "page" : undefined}
            className={
              activo
                ? "rounded-md bg-secondary px-3 py-1.5 font-medium text-secondary-foreground"
                : "rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-secondary-foreground"
            }
          >
            {opcion.label}
          </Link>
        );
      })}
    </nav>
  );
}

function TarjetaTotal({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: number;
  detalle: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {titulo}
      </div>
      <div className="text-xl font-bold tabular-nums mt-1">{formatCOP(valor)}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{detalle}</div>
    </div>
  );
}

function PrestamosTable({ prestamos }: { prestamos: PrestamoView[] }) {
  return (
    <ResponsiveTable
      rows={prestamos}
      rowKey={(p) => p.id}
      emptyMessage="No hay préstamos en esta vista."
      columns={[
        {
          key: "fecha",
          header: "Fecha",
          cell: (p) => <span className="tabular-nums">{formatShortDate(p.fecha)}</span>,
        },
        {
          key: "persona",
          header: "Persona",
          cell: (p) => (
            <div className="min-w-0">
              <div className="font-medium">{p.persona}</div>
              {p.nota && (
                <div className="text-xs text-muted-foreground">{p.nota}</div>
              )}
            </div>
          ),
        },
        {
          key: "valor",
          header: "Valor",
          align: "right",
          cell: (p) => (
            <span className="tabular-nums font-semibold">{formatCOP(p.valor)}</span>
          ),
        },
        {
          key: "estado",
          header: "Estado",
          cell: (p) => <EstadoPrestamo prestamo={p} />,
        },
        {
          key: "acciones",
          header: "",
          align: "right",
          cell: (p) => (
            <div className="flex justify-end gap-1">
              <AlternarPagoButton prestamo={p} />
              <EliminarPrestamoButton prestamo={p} />
            </div>
          ),
        },
      ]}
      fields={[
        {
          key: "fecha",
          label: "Fecha",
          render: (p) => <span className="tabular-nums">{formatShortDate(p.fecha)}</span>,
        },
        {
          key: "persona",
          label: "Persona",
          render: (p) => (
            <div className="min-w-0">
              <div className="font-medium">{p.persona}</div>
              {p.nota && (
                <div className="text-xs text-muted-foreground">{p.nota}</div>
              )}
            </div>
          ),
        },
        {
          key: "valor",
          label: "Valor",
          render: (p) => (
            <span className="tabular-nums font-semibold">{formatCOP(p.valor)}</span>
          ),
        },
        {
          key: "estado",
          label: "Estado",
          render: (p) => <EstadoPrestamo prestamo={p} />,
        },
        {
          key: "acciones",
          label: "",
          fullWidth: true,
          render: (p) => (
            <div className="flex justify-end gap-1 pt-2">
              <AlternarPagoButton prestamo={p} />
              <EliminarPrestamoButton prestamo={p} />
            </div>
          ),
        },
      ]}
    />
  );
}

const TONO: Record<"pendiente" | "pagado", EstadoTono> = {
  pendiente: "alerta",
  pagado: "exito",
};

function EstadoPrestamo({ prestamo }: { prestamo: PrestamoView }) {
  if (prestamo.pagado) {
    return (
      <StatusBadge tono={TONO.pagado}>
        Pagado{prestamo.fechaPago ? ` el ${formatShortDate(prestamo.fechaPago)}` : ""}
      </StatusBadge>
    );
  }
  return <StatusBadge tono={TONO.pendiente}>Pendiente</StatusBadge>;
}

/** Marca el préstamo como pagado o lo vuelve a pendiente. */
function AlternarPagoButton({ prestamo }: { prestamo: PrestamoView }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", prestamo.id);
      await alternarPagoPrestamoAction(fd);
      toast.success(
        prestamo.pagado
          ? `El préstamo a ${prestamo.persona} volvió a pendiente`
          : `Préstamo a ${prestamo.persona} marcado como pagado`,
      );
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      title={
        prestamo.pagado
          ? "Volver a pendiente"
          : "Marcar como pagado"
      }
    >
      {prestamo.pagado ? (
        <>
          <Undo2 className="size-4" />
          Pendiente
        </>
      ) : (
        <>
          <Check className="size-4" />
          Pagado
        </>
      )}
    </Button>
  );
}

/** Borra el préstamo (con confirmación). */
function EliminarPrestamoButton({ prestamo }: { prestamo: PrestamoView }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", prestamo.id);
      await eliminarPrestamoAction(fd);
      toast.success("Préstamo eliminado");
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-destructive"
        aria-label={`Eliminar el préstamo a ${prestamo.persona}`}
      >
        <Trash2 className="size-4" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Eliminar préstamo"
        description={`¿Eliminar el préstamo de ${formatCOP(prestamo.valor)} a ${prestamo.persona}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleConfirm}
        pending={pending}
      />
    </>
  );
}
