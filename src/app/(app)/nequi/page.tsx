import { prisma } from "@/lib/db";
import { startOfDayUTC } from "@/lib/dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NequiTable } from "./nequi-table";
import { Smartphone } from "lucide-react";

type Props = {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
};

export default async function NequiPage({ searchParams }: Props) {
  const params = await searchParams;
  const hoy = startOfDayUTC(new Date());
  const desde = params.desde ? new Date(`${params.desde}T00:00:00.000Z`) : new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const hasta = params.hasta ? new Date(`${params.hasta}T00:00:00.000Z`) : hoy;

  const nequi = await prisma.nequiDelDia.findMany({
    where: { fecha: { gte: desde, lte: hasta } },
    orderBy: { fecha: "desc" },
  });

  const total = nequi.reduce((s, n) => s + n.total, 0);

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Smartphone className="size-7" /> Nequi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {nequi.length} días con Nequi · Total recibido{" "}
          {total.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nequi recibido por día</CardTitle>
          <CardDescription>Un solo renglón por día. Editá el valor directamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <NequiTable
            entries={nequi.map((n) => ({
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
