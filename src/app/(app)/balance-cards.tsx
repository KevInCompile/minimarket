import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { formatCOP } from "@/lib/format";
import type { BalanceGeneral } from "@/lib/calc";
import { Banknote, Coins, Smartphone, Wallet, TrendingDown, TrendingUp } from "lucide-react";

type Item = {
  title: string;
  value: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  gradient: string; // clases de Tailwind para fondo y borde
  iconBg: string;
};

const ITEMS_FN = (bg: BalanceGeneral): Item[] => [
  {
    title: "TOTAL DISPONIBLE HOY",
    value: formatCOP(bg.totalDisponible),
    description: `${formatCOP(bg.saldoEfectivoActual)} efectivo + ${formatCOP(bg.saldoNequiActual)} Nequi`,
    icon: Banknote,
    highlight: true,
    gradient:
      "border-emerald-300 bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-teal-50 dark:border-emerald-700 dark:from-emerald-950/40 dark:via-emerald-950/30 dark:to-teal-950/40",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white",
  },
  {
    title: "Efectivo guardado",
    value: formatCOP(bg.saldoEfectivoActual),
    description: `Punto mas bajo: ${formatCOP(bg.puntoMasBajoEfectivo)}`,
    icon: Coins,
    gradient:
      "border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50/60 dark:border-sky-800 dark:from-sky-950/30 dark:to-cyan-950/30",
    iconBg: "bg-gradient-to-br from-sky-500 to-cyan-500 text-white",
  },
  {
    title: "Saldo Nequi",
    value: formatCOP(bg.saldoNequiActual),
    description: `Recibido en el periodo: ${formatCOP(bg.nequiRecibidoPeriodo)}`,
    icon: Smartphone,
    gradient:
      "border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50/60 dark:border-violet-800 dark:from-violet-950/30 dark:to-fuchsia-950/30",
    iconBg: "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white",
  },
  {
    title: "Ultimo cierre de caja",
    value: formatCOP(bg.ultimoCajaCierre),
    description: bg.efectivoRealUltimoConteo != null
      ? `Ultimo conteo real: ${formatCOP(bg.efectivoRealUltimoConteo)}`
      : undefined,
    icon: Wallet,
    gradient:
      "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/60 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/30",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
  },
  {
    title: "Gastos del periodo",
    value: formatCOP(bg.totalGastos),
    description: `Caja: ${formatCOP(bg.gastosCaja)} · Efectivo: ${formatCOP(bg.gastosEfectivo)}`,
    icon: TrendingDown,
    gradient:
      "border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50/60 dark:border-rose-800 dark:from-rose-950/30 dark:to-pink-950/30",
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-500 text-white",
  },
  {
    title: "Retiros del periodo",
    value: formatCOP(bg.totalRetiros),
    description: `Efectivo: ${formatCOP(bg.retirosEfectivo)} · Nequi: ${formatCOP(bg.retirosNequi)}`,
    icon: TrendingUp,
    gradient:
      "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50/60 dark:border-orange-800 dark:from-orange-950/30 dark:to-amber-950/30",
    iconBg: "bg-gradient-to-br from-orange-500 to-amber-500 text-white",
  },
];

export function BalanceCards({ bg }: { bg: BalanceGeneral }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ITEMS_FN(bg).map((item) => (
        <Card
          key={item.title}
          className={`${item.gradient} ${item.highlight ? "ring-2 ring-emerald-300/60 dark:ring-emerald-700/60" : ""} transition-shadow hover:shadow-md`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription className="font-semibold uppercase tracking-wide text-xs">
              {item.title}
            </CardDescription>
            <div className={`size-8 rounded-lg ${item.iconBg} flex items-center justify-center`}>
              <item.icon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{item.value}</div>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                {item.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
