import { prisma } from "@/lib/db";
import { startOfDayUTC } from "@/lib/dates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RetiroForm } from "./retiro-form";
import { RetirosTable } from "./retiros-table";
import { Wallet, TrendingDown, Banknote } from "lucide-react";
import { formatCOP } from "@/lib/format";

type Props = {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
};

export default async function RetirosPage({ searchParams }: Props) {
  const params = await searchParams;
  const hoy = startOfDayUTC(new Date());
  const desde = params.desde
    ? new Date(`${params.desde}T00:00:00.000Z`)
    : new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const hasta = params.hasta ? new Date(`${params.hasta}T00:00:00.000Z`) : hoy;

  const retiros = await prisma.retiro.findMany({
    where: { fecha: { gte: desde, lte: hasta } },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });

  const total = retiros.reduce((s, r) => s + r.valor, 0);
  const porSaleDe = {
    EFECTIVO: retiros
      .filter((r) => r.saleDe === "EFECTIVO")
      .reduce((s, r) => s + r.valor, 0),
    NEQUI: retiros
      .filter((r) => r.saleDe === "NEQUI")
      .reduce((s, r) => s + r.valor, 0),
    CAJA: retiros
      .filter((r) => r.saleDe === "CAJA")
      .reduce((s, r) => s + r.valor, 0),
  };
  const porTipo = retiros.reduce<Record<string, number>>((acc, r) => {
    acc[r.tipo] = (acc[r.tipo] ?? 0) + r.valor;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="size-7 text-rose-600 dark:text-rose-400" />
          Retiros
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {retiros.length} retiros · Total{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {formatCOP(total)}
          </span>
        </p>
      </header>

      {/* Resumen del impacto en el acumulado */}
      {retiros.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            icon={Banknote}
            label="Descontado del efectivo acumulado"
            value={porSaleDe.EFECTIVO}
            color="border-sky-200 bg-linear-to-br from-sky-50 to-cyan-50/60 dark:border-sky-800 dark:from-sky-950/30 dark:to-cyan-950/30"
            iconColor="bg-linear-to-br from-sky-500 to-cyan-500 text-white"
          />
          <StatCard
            icon={TrendingDown}
            label="Descontado del saldo Nequi"
            value={porSaleDe.NEQUI}
            color="border-violet-200 bg-linear-to-br from-violet-50 to-fuchsia-50/60 dark:border-violet-800 dark:from-violet-950/30 dark:to-fuchsia-950/30"
            iconColor="bg-linear-to-br from-violet-500 to-fuchsia-500 text-white"
          />
          <StatCard
            icon={Wallet}
            label="Salido de la caja del día"
            value={porSaleDe.CAJA}
            color="border-sky-200 bg-linear-to-br from-sky-50 to-cyan-50/60 dark:border-sky-800 dark:from-sky-950/30 dark:to-cyan-950/30"
            iconColor="bg-linear-to-br from-sky-500 to-cyan-500 text-white"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Listado</CardTitle>
            <CardDescription>
              {Object.keys(porTipo).length > 0
                ? `Por tipo: ${Object.entries(porTipo)
                    .map(([tipo, val]) => `${tipo.toLowerCase()} ${formatCOP(val)}`)
                    .join(" · ")}`
                : "Arriendo, nómina y similares."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetirosTable
              retiros={retiros.map((r) => ({
                id: r.id,
                fecha: r.fecha.toISOString(),
                tipo: r.tipo,
                concepto: r.concepto,
                valor: r.valor,
                saleDe: r.saleDe,
                nota: r.nota,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nuevo retiro</CardTitle>
            <CardDescription>
              Cada retiro se descuenta del total acumulado del día siguiente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetiroForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  iconColor: string;
}) {
  return (
    <div className={`rounded-lg p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
          {label}
        </span>
        <div className={`size-8 rounded-lg ${iconColor} flex items-center justify-center`}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="text-xl font-bold tabular-nums">
        {value === 0 ? <span className="text-muted-foreground text-base">$ 0</span> : formatCOP(value)}
      </div>
    </div>
  );
}
