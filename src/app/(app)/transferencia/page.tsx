import { prisma } from "@/lib/db";
import { startOfDayUTC } from "@/lib/dates";
import { requireTiendaId } from "@/lib/auth-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransferenciaTable } from "./transferencia-table";
import { Smartphone } from "lucide-react";

type Props = {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
};

export default async function TransferenciaPage({ searchParams }: Props) {
  const params = await searchParams;
  const tiendaId = await requireTiendaId();
  const hoy = startOfDayUTC(new Date());
  const desde = params.desde ? new Date(`${params.desde}T00:00:00.000Z`) : new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const hasta = params.hasta ? new Date(`${params.hasta}T00:00:00.000Z`) : hoy;

  const transferencia = await prisma.transferenciaDia.findMany({
    where: { tiendaId, fecha: { gte: desde, lte: hasta } },
    orderBy: { fecha: "desc" },
  });

  const total = transferencia.reduce((s, n) => s + n.total, 0);

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Smartphone className="size-7" /> Transferencia
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {transferencia.length} días con Transferencia · Total recibido{" "}
          {total.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Transferencia recibido por día</CardTitle>
          <CardDescription>Un solo renglón por día. Editá el valor directamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <TransferenciaTable
            entries={transferencia.map((n) => ({
              id: n.id,
              fecha: n.fecha.toISOString(),
              total: n.total,
            }))}
            desde={desde.toISOString()}
            hasta={hasta.toISOString()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
