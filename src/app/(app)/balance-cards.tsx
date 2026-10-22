"use client";

import {
  Banknote,
  Coins,
  Receipt,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { formatCOP } from "@/lib/format";
import type { BalanceGeneral, MetricaTendencia, PuntoMes } from "@/lib/calc";
import { Sparkline } from "./dashboard-charts";
import { BotonKebab } from "@/components/boton-kebab";

export type TendenciasFlujos = {
  gastos: MetricaTendencia;
  retiros: MetricaTendencia;
  transferenciaRecibido: MetricaTendencia;
  efectivoGuardado: MetricaTendencia;
};

/**
 * Una serie mensual por tarjeta. Todas salen de `calc.ts` con las mismas claves
 * de mes, así que los cuatro sparklines comparten el eje X.
 */
export type SeriesKpi = {
  totalDisponible: PuntoMes[];
  efectivoGuardado: PuntoMes[];
  gastos: PuntoMes[];
  transferenciaRecibido: PuntoMes[];
};

const COLOR_SKY = "#0284c7";
const COLOR_ESMERALDA = "#10b981";
const COLOR_ROSA = "#f43f5e";
const COLOR_VIOLETA = "#8b5cf6";

type Tarjeta = {
  titulo: string;
  valor: string;
  detalle?: string;
  tendencia?: MetricaTendencia;
  /** Si subir es buena noticia (entradas) o mala (salidas). */
  subeEsBueno?: boolean;
  icon: LucideIcon;
  /** Clases Tailwind del chip: fondo tintado + icono en el acento. */
  chip: string;
  accent: string;
  serie: PuntoMes[];
};

/**
 * Sólo los flujos llevan tendencia: los saldos reinician el acumulador en cada
 * llamada a `balanceGeneral()`, así que compararlos entre periodos mentiría.
 */
function tarjetas(
  bg: BalanceGeneral,
  t: TendenciasFlujos,
  series: SeriesKpi,
): Tarjeta[] {
  return [
    {
      titulo: "Total disponible",
      valor: formatCOP(bg.totalDisponible),
      detalle: `${formatCOP(bg.saldoEfectivoActual)} efectivo · ${formatCOP(bg.saldoTransferenciaActual)} transferencia`,
      icon: Banknote,
      chip: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
      accent: COLOR_SKY,
      serie: series.totalDisponible,
    },
    {
      titulo: "Efectivo guardado",
      valor: formatCOP(bg.efectivoGuardadoPeriodo),
      tendencia: t.efectivoGuardado,
      subeEsBueno: true,
      icon: Coins,
      chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
      accent: COLOR_ESMERALDA,
      serie: series.efectivoGuardado,
    },
    {
      titulo: "Gastos del periodo",
      valor: formatCOP(bg.totalGastos),
      tendencia: t.gastos,
      subeEsBueno: false,
      icon: Receipt,
      chip: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
      accent: COLOR_ROSA,
      serie: series.gastos,
    },
    {
      titulo: "Transferencia recibida",
      valor: formatCOP(bg.transferenciaRecibidoPeriodo),
      tendencia: t.transferenciaRecibido,
      subeEsBueno: true,
      icon: Smartphone,
      chip: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
      accent: COLOR_VIOLETA,
      serie: series.transferenciaRecibido,
    },
  ];
}

export function BalanceCards({
  bg,
  tendencias,
  series,
}: {
  bg: BalanceGeneral;
  tendencias: TendenciasFlujos;
  series: SeriesKpi;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tarjetas(bg, tendencias, series).map((t) => (
        <article
          key={t.titulo}
          className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                  t.chip,
                )}
              >
                <t.icon className="size-4" />
              </span>
              <span className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.titulo}
              </span>
            </div>
            <BotonKebab titulo={t.titulo} className="-mt-1 -mr-1" />
          </div>

          <p className="mt-3 text-2xl font-bold tabular-nums text-foreground xl:text-3xl">
            {t.valor}
          </p>

          {t.tendencia ? (
            <IndicadorTendencia
              tendencia={t.tendencia}
              subeEsBueno={t.subeEsBueno ?? true}
            />
          ) : (
            <p className="mt-1 truncate text-xs tabular-nums text-muted-foreground">
              {t.detalle}
            </p>
          )}

          <div className="mt-auto pt-3">
            <Sparkline data={t.serie} color={t.accent} />
          </div>
        </article>
      ))}
    </div>
  );
}

function IndicadorTendencia({
  tendencia,
  subeEsBueno,
}: {
  tendencia: MetricaTendencia;
  subeEsBueno: boolean;
}) {
  // Sin datos del periodo anterior el porcentaje no existe: no se renderiza
  // nada en vez de un Infinity/NaN.
  if (tendencia.pct === null) return null;

  const flecha =
    tendencia.direccion === "sube"
      ? "↑"
      : tendencia.direccion === "baja"
        ? "↓"
        : "→";
  const color =
    tendencia.direccion === "igual"
      ? "text-muted-foreground"
      : (tendencia.direccion === "sube") === subeEsBueno
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-rose-600 dark:text-rose-400";

  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium tabular-nums">
      <span className={color} aria-hidden>
        {flecha} {Math.abs(tendencia.pct).toFixed(1)}%
      </span>
      <span className="font-normal text-muted-foreground">vs mes anterior</span>
    </p>
  );
}