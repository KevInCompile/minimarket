"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Save,
  Trash2,
} from "lucide-react";
import { formatCOP, formatShortDate } from "@/lib/format";
import { diaSemana } from "@/lib/dates";
import {
  guardarCierreAction,
  eliminarCierreAction,
} from "@/server/actions/cierre";
import { ConfirmDialog } from "@/components/confirm-dialog";

type RowView = {
  fecha: string;
  cajaApertura: number;
  cajaCierre: number;
  efectivoGuardado: number;
  efectivoRealContado: number | null;
  gastosCaja: number;
  gastosEfectivo: number;
  totalGastos: number;
  entradaEstimada: number;
  retirosEfectivo: number;
  retirosNequi: number;
  nequiDelDia: number;
  efectivoAcumulado: number;
  nequiAcumulado: number;
  descuadre: number | null;
};

export function CierreCards({
  rows,
  pendientes,
}: {
  rows: RowView[];
  pendientes: string[];
}) {
  const pendientesSet = new Set(pendientes);
  return (
    <div className="space-y-3">
      {rows.length === 0 && pendientes.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Sin cierres en el periodo. Usá el form de arriba para crear el primero.
        </p>
      )}

      {pendientes.map((fecha) => (
        <PendienteCard key={fecha} fecha={fecha} />
      ))}

      {rows.map((r) => (
        <CierreCard
          key={r.fecha}
          row={r}
          hasMovimiento={pendientesSet.has(r.fecha.slice(0, 10))}
        />
      ))}
    </div>
  );
}

function PendienteCard({ fecha }: { fecha: string }) {
  const [open, setOpen] = useState(false);
  const date = new Date(fecha);

  return (
    <Card className="border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-700">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0" />
        ) : (
          <ChevronRight className="size-4 shrink-0" />
        )}
        <AlertTriangle className="size-4 text-yellow-600 shrink-0" />
        <div className="flex-1">
          <div className="font-medium text-sm">
            {diaSemana(date)} {formatShortDate(date)}
          </div>
          <div className="text-xs text-muted-foreground">
            Hay movimientos pero todavía no se hizo el cierre
          </div>
        </div>
      </button>
      {open && (
        <CardContent className="pt-0 pb-4">
          <Separator className="my-3" />
          <p className="text-sm text-muted-foreground">
            Para hacer el cierre de este día, primero cargá los gastos / retiros /
            Nequi en sus respectivas páginas. Después volvé acá y creá el cierre
            con el botón de arriba.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function CierreCard({
  row,
  hasMovimiento,
}: {
  row: RowView;
  hasMovimiento: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const date = new Date(row.fecha);
  const fechaStr = row.fecha.slice(0, 10);
  const tieneDescuadre = row.descuadre != null && row.descuadre !== 0;
  const sinDescuadreYContado =
    row.descuadre === 0 && row.efectivoRealContado != null;

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("fecha", formData.get("fecha")?.toString() ?? "");
      fd.append(
        "cajaApertura",
        formData.get("cajaApertura")?.toString() ?? "0",
      );
      fd.append("cajaCierre", formData.get("cajaCierre")?.toString() ?? "0");
      fd.append(
        "efectivoGuardado",
        formData.get("efectivoGuardado")?.toString() ?? "0",
      );
      fd.append(
        "efectivoRealContado",
        formData.get("efectivoRealContado")?.toString() ?? "",
      );
      const result = await guardarCierreAction({ ok: true, ts: 0 }, fd);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success("Cierre guardado");
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const fd = new FormData();
    fd.append("fecha", fechaStr);
    await eliminarCierreAction(fd);
    toast.success("Cierre eliminado");
  }

  return (
    <Card
      className={
        tieneDescuadre
          ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/15 dark:border-amber-700"
          : sinDescuadreYContado
            ? "border-emerald-200 dark:border-emerald-800"
            : undefined
      }
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0" />
        ) : (
          <ChevronRight className="size-4 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-medium">{diaSemana(date)}</span>
            <span className="text-sm text-muted-foreground">
              {formatShortDate(date)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
            <span>
              Caja cierre:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatCOP(row.cajaCierre)}
              </span>
            </span>
            <span>
              Guardado:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatCOP(row.efectivoGuardado)}
              </span>
            </span>
            {tieneDescuadre && (
              <Badge
                variant="outline"
                className="font-normal border-amber-500 text-amber-700 dark:text-amber-400"
              >
                Descuadre {formatCOP(row.descuadre!)}
              </Badge>
            )}
            {sinDescuadreYContado && (
              <Badge
                variant="secondary"
                className="font-normal bg-emerald-100 dark:bg-emerald-950/40"
              >
                Cuadra ✓
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted-foreground">Acum. efectivo</div>
          <div className="text-base font-bold tabular-nums">
            {formatCOP(row.efectivoAcumulado)}
          </div>
        </div>
      </button>

      {open && (
        <CardContent className="pt-0 pb-4 space-y-4">
          <Separator />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="Gastos caja" value={row.gastosCaja} />
            <Metric label="Gastos efvo" value={row.gastosEfectivo} />
            <Metric label="Total gastos" value={row.totalGastos} bold />
            <Metric label="Entrada est." value={row.entradaEstimada} muted />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="Retiros efvo" value={row.retirosEfectivo} />
            <Metric label="Retiros Nequi" value={row.retirosNequi} />
            <Metric label="Nequi recibido" value={row.nequiDelDia} />
            <Metric label="Nequi acum." value={row.nequiAcumulado} bold />
          </div>

          {tieneDescuadre && (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3 text-sm">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
                <AlertTriangle className="size-4" />
                Descuadre de {formatCOP(row.descuadre!)}
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Conteo físico: {formatCOP(row.efectivoRealContado ?? 0)} vs
                acumulado: {formatCOP(row.efectivoAcumulado)}.
                Revisá si faltan gastos o retiros con Efectivo.
              </p>
            </div>
          )}

          {!editing ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <span className="text-muted-foreground">Caja apertura:</span>{" "}
                <span className="tabular-nums font-medium">
                  {formatCOP(row.cajaApertura)}
                </span>
                {row.efectivoRealContado != null && (
                  <>
                    <span className="text-muted-foreground ml-4">Conteo real:</span>{" "}
                    <span className="tabular-nums font-medium">
                      {formatCOP(row.efectivoRealContado)}
                    </span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  Editar
                </Button>
                {!hasMovimiento && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <form
              action={handleSubmit}
              className="rounded-md border-2 border-primary/40 bg-primary/5 p-4 space-y-4"
            >
              <input type="hidden" name="fecha" value={fechaStr} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MoneyField
                  name="cajaApertura"
                  label="Caja apertura"
                  defaultValue={row.cajaApertura}
                  help="Plata que se dejó en caja para arrancar el día."
                />
                <MoneyField
                  name="cajaCierre"
                  label="Caja cierre"
                  defaultValue={row.cajaCierre}
                  help="Lo que se contó al final del día."
                  highlight
                />
                <MoneyField
                  name="efectivoGuardado"
                  label="Efectivo guardado"
                  defaultValue={row.efectivoGuardado}
                  help="Lo que se guardó aparte de la caja."
                  highlight
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`real-${fechaStr}`}>
                  Conteo físico de efectivo (opcional)
                </Label>
                <Input
                  id={`real-${fechaStr}`}
                  name="efectivoRealContado"
                  type="text"
                  inputMode="numeric"
                  defaultValue={row.efectivoRealContado ?? ""}
                  placeholder="Dejar vacío si no se contó"
                  className="tabular-nums max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Si lo completás, se calcula el descuadre vs el acumulado.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  <Save className="size-4" />
                  {saving ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar cierre"
        description={
          hasMovimiento
            ? "No se puede eliminar este cierre porque tiene gastos, retiros o Nequi registrados. Borrá los movimientos primero."
            : `¿Eliminar el cierre del ${formatShortDate(date)}? Esta acción no se puede deshacer.`
        }
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </Card>
  );
}

function Metric({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: number;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={
          "tabular-nums " +
          (bold ? "text-base font-bold" : "text-sm font-medium") +
          (muted ? " text-muted-foreground" : "")
        }
      >
        {formatCOP(value)}
      </div>
    </div>
  );
}

function MoneyField({
  name,
  label,
  defaultValue,
  help,
  highlight,
}: {
  name: string;
  label: string;
  defaultValue: number;
  help: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={`${name}-${defaultValue}`}
        className={highlight ? "font-semibold" : ""}
      >
        {label}
      </Label>
      <Input
        id={`${name}-${defaultValue}`}
        name={name}
        type="text"
        inputMode="numeric"
        defaultValue={defaultValue}
        className={
          "tabular-nums " + (highlight ? "border-primary font-semibold" : "")
        }
      />
      <p className="text-xs text-muted-foreground">{help}</p>
    </div>
  );
}
