import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { formatCOP } from "@/lib/format";
import { AlertTriangle, Banknote, Coins, Smartphone, TrendingDown } from "lucide-react";
import type { CierreDiarioComputed } from "@/lib/calc";

type ResumenProps = {
  serie: CierreDiarioComputed[];
};

export function ResumenPeriodo({ serie }: ResumenProps) {
  const ultimo = serie[serie.length - 1];
  const puntoMasBajo = serie.reduce(
    (min, c) => Math.min(min, c.efectivoAcumulado),
    Number.POSITIVE_INFINITY,
  );
  const diasConDescuadre = serie.filter(
    (c) => c.descuadre != null && c.descuadre !== 0,
  ).length;

  const totalGastos = serie.reduce((s, c) => s + c.totalGastos, 0);
  const totalEntradaEstimada = serie.reduce((s, c) => s + c.entradaEstimada, 0);

  return (
    <div className="space-y-3">
      {diasConDescuadre > 0 && (
        <div className="rounded-md border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30 dark:border-amber-700 p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {diasConDescuadre === 1
                ? "Hay 1 día con descuadre"
                : `Hay ${diasConDescuadre} días con descuadre`}
            </p>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1">
              El conteo físico de efectivo no coincide con el acumulado. Revisá
              abajo los días marcados en amarillo.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          icon={Banknote}
          label="Efectivo acumulado"
          value={formatCOP(ultimo?.efectivoAcumulado ?? 0)}
          sub={`Punto mas bajo: ${formatCOP(
            puntoMasBajo === Number.POSITIVE_INFINITY ? 0 : puntoMasBajo,
          )}`}
          gradient="border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50/60 dark:border-sky-800 dark:from-sky-950/30 dark:to-cyan-950/30"
          iconBg="bg-gradient-to-br from-sky-500 to-cyan-500 text-white"
        />
        <Stat
          icon={Smartphone}
          label="Nequi acumulado"
          value={formatCOP(ultimo?.nequiAcumulado ?? 0)}
          sub={`Último día: ${ultimo ? formatCOP(ultimo.nequiDelDia) : "—"} recibido`}
          gradient="border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50/60 dark:border-violet-800 dark:from-violet-950/30 dark:to-fuchsia-950/30"
          iconBg="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
        />
        <Stat
          icon={Coins}
          label="Último cierre de caja"
          value={formatCOP(ultimo?.cajaCierre ?? 0)}
          sub={
            ultimo?.efectivoRealContado != null
              ? `Conteo real: ${formatCOP(ultimo.efectivoRealContado)}`
              : "Sin conteo real"
          }
          gradient="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/60 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/30"
          iconBg="bg-gradient-to-br from-amber-500 to-orange-500 text-white"
        />
        <Stat
          icon={TrendingDown}
          label="Total gastos del periodo"
          value={formatCOP(totalGastos)}
          sub={`Entrada estimada: ${formatCOP(totalEntradaEstimada)}`}
          gradient="border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50/60 dark:border-rose-800 dark:from-rose-950/30 dark:to-pink-950/30"
          iconBg="bg-gradient-to-br from-rose-500 to-pink-500 text-white"
        />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
  iconBg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  gradient: string;
  iconBg: string;
}) {
  return (
    <Card className={gradient}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="font-semibold uppercase tracking-wide text-xs">
          {label}
        </CardDescription>
        <div className={`size-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 tabular-nums">{sub}</p>
      </CardContent>
    </Card>
  );
}
