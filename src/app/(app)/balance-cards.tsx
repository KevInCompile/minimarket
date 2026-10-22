import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { formatCOP } from "@/lib/format";
import type { BalanceGeneral, MetricaTendencia } from "@/lib/calc";
import {
  Banknote,
  Coins,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

export type TendenciasFlujos = {
  gastos: MetricaTendencia;
  retiros: MetricaTendencia;
  transferenciaRecibido: MetricaTendencia;
  efectivoGuardado: MetricaTendencia;
};

type Item = {
  title: string;
  value: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  gradient: string; // Tailwind classes for background and border
  iconBg: string;
  trend?: MetricaTendencia;
  /** Whether a rising metric is good news (entrances) or bad news (outflows). */
  upIsGood?: boolean;
};

const GRADIENTE_SKY =
  "border-sky-200 bg-linear-to-br from-sky-50 to-cyan-50/60 dark:border-sky-800 dark:from-sky-950/30 dark:to-cyan-950/30";
const ICONO_SKY = "bg-linear-to-br from-sky-500 to-cyan-500 text-white";
const GRADIENTE_VIOLETA =
  "border-violet-200 bg-linear-to-br from-violet-50 to-fuchsia-50/60 dark:border-violet-800 dark:from-violet-950/30 dark:to-fuchsia-950/30";
const ICONO_VIOLETA =
  "bg-linear-to-br from-violet-500 to-fuchsia-500 text-white";

/**
 * Only flow metrics carry a trend: balances restart from zero on every
 * `balanceGeneral()` call, so comparing them across periods would mislead.
 */
const GRUPOS = (
  bg: BalanceGeneral,
  t: TendenciasFlujos,
): { titulo: string; items: Item[] }[] => [
  {
    titulo: "Liquidez actual",
    items: [
      {
        title: "Total disponible",
        value: formatCOP(bg.totalDisponible),
        description: `${formatCOP(bg.saldoEfectivoActual)} efectivo + ${formatCOP(bg.saldoTransferenciaActual)} Transferencia`,
        icon: Banknote,
        highlight: true,
        gradient:
          "border-sky-300 bg-linear-to-br from-sky-50 via-sky-50/80 to-blue-50 dark:border-sky-700 dark:from-sky-950/40 dark:via-sky-950/30 dark:to-blue-950/40",
        iconBg: "bg-linear-to-br from-sky-700 to-blue-800 text-white",
      },
      {
        title: "Saldo efectivo",
        value: formatCOP(bg.saldoEfectivoActual),
        description: `Punto mas bajo: ${formatCOP(bg.puntoMasBajoEfectivo)}`,
        icon: Coins,
        gradient: GRADIENTE_SKY,
        iconBg: ICONO_SKY,
      },
      {
        title: "Saldo Transferencia",
        value: formatCOP(bg.saldoTransferenciaActual),
        icon: Smartphone,
        gradient: GRADIENTE_VIOLETA,
        iconBg: ICONO_VIOLETA,
      },
      {
        title: "Ultimo cierre de caja",
        value: formatCOP(bg.ultimoCajaCierre),
        description:
          bg.efectivoRealUltimoConteo != null
            ? `Ultimo conteo real: ${formatCOP(bg.efectivoRealUltimoConteo)}`
            : undefined,
        icon: Wallet,
        gradient: GRADIENTE_SKY,
        iconBg: ICONO_SKY,
      },
    ],
  },
  {
    titulo: "Entradas del mes",
    items: [
      {
        title: "Efectivo guardado",
        value: formatCOP(bg.efectivoGuardadoPeriodo),
        icon: Coins,
        gradient: GRADIENTE_SKY,
        iconBg: ICONO_SKY,
        trend: t.efectivoGuardado,
        upIsGood: true,
      },
      {
        title: "Transferencia recibido",
        value: formatCOP(bg.transferenciaRecibidoPeriodo),
        icon: Smartphone,
        gradient: GRADIENTE_VIOLETA,
        iconBg: ICONO_VIOLETA,
        trend: t.transferenciaRecibido,
        upIsGood: true,
      },
    ],
  },
  {
    titulo: "Salidas del mes",
    items: [
      {
        title: "Gastos del periodo",
        value: formatCOP(bg.totalGastos),
        description: `Caja: ${formatCOP(bg.gastosCaja)} · Efectivo: ${formatCOP(bg.gastosEfectivo)} · Transf.: ${formatCOP(bg.gastosTransferencia)}`,
        icon: TrendingDown,
        gradient: GRADIENTE_SKY,
        iconBg: ICONO_SKY,
        trend: t.gastos,
        upIsGood: false,
      },
      {
        title: "Retiros del periodo",
        value: formatCOP(bg.totalRetiros),
        description: `Efectivo: ${formatCOP(bg.retirosEfectivo)} · Transferencia: ${formatCOP(bg.retirosTransferencia)}`,
        icon: TrendingUp,
        gradient: GRADIENTE_SKY,
        iconBg: ICONO_SKY,
        trend: t.retiros,
        upIsGood: false,
      },
    ],
  },
];

export function BalanceCards({
  bg,
  tendencias,
}: {
  bg: BalanceGeneral;
  tendencias: TendenciasFlujos;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
      {GRUPOS(bg, tendencias).map((grupo) => (
        <section key={grupo.titulo} className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {grupo.titulo}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {grupo.items.map((item) => (
              <Card
                key={item.title}
                className={`${item.gradient} ${item.highlight ? "ring-2 ring-sky-300/60 dark:ring-sky-700/60" : ""} transition-shadow hover:shadow-md`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardDescription className="font-semibold uppercase tracking-wide text-xs">
                    {item.title}
                  </CardDescription>
                  <div
                    className={`size-8 shrink-0 rounded-lg ${item.iconBg} flex items-center justify-center`}
                  >
                    <item.icon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums">{item.value}</div>
                  {item.description && (
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {item.description}
                    </p>
                  )}
                  {item.trend && (
                    <IndicadorTendencia
                      tendencia={item.trend}
                      upIsGood={item.upIsGood ?? true}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function IndicadorTendencia({
  tendencia,
  upIsGood,
}: {
  tendencia: MetricaTendencia;
  upIsGood: boolean;
}) {
  // With no previous data the percentage is undefined: render nothing rather
  // than Infinity or NaN.
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
      : (tendencia.direccion === "sube") === upIsGood
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-rose-600 dark:text-rose-400";

  return (
    <p className="mt-2 text-xs font-medium tabular-nums">
      <span className="sr-only">
        {tendencia.direccion === "sube"
          ? "Sube"
          : tendencia.direccion === "baja"
            ? "Baja"
            : "Igual"}{" "}
        vs periodo anterior:{" "}
      </span>
      <span className={color} aria-hidden>
        {flecha} {Math.abs(tendencia.pct).toFixed(1)}%
      </span>
    </p>
  );
}