import { prisma } from "@/lib/db";
import { startOfDayUTC } from "@/lib/dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RetiroForm } from "./retiro-form";
import { RetirosTable } from "./retiros-table";
import { Wallet } from "lucide-react";

type Props = {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
};

export default async function RetirosPage({ searchParams }: Props) {
  const params = await searchParams;
  const hoy = startOfDayUTC(new Date());
  const desde = params.desde ? new Date(`${params.desde}T00:00:00.000Z`) : new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const hasta = params.hasta ? new Date(`${params.hasta}T00:00:00.000Z`) : hoy;

  const retiros = await prisma.retiro.findMany({
    where: { fecha: { gte: desde, lte: hasta } },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });

  const total = retiros.reduce((s, r) => s + r.valor, 0);

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="size-7" /> Retiros
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {retiros.length} retiros · Total {total.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Listado</CardTitle>
            <CardDescription>Arriendo, nómina y similares.</CardDescription>
          </CardHeader>
          <CardContent>
            <RetirosTable
              retiros={retiros.map((r) => ({
                id: r.id,
                fecha: r.fecha.toISOString(),
                concepto: r.concepto,
                valor: r.valor,
                saleDe: r.saleDe,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nuevo retiro</CardTitle>
            <CardDescription>Plata que sale del negocio y no es compra.</CardDescription>
          </CardHeader>
          <CardContent>
            <RetiroForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
