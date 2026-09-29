import { prisma } from "@/lib/db";
import { GastosTable } from "./gastos-table";
import { GastoForm } from "./gasto-form";
import { startOfDayUTC } from "@/lib/dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt } from "lucide-react";

type Props = {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
};

export default async function GastosPage({ searchParams }: Props) {
  const params = await searchParams;
  const hoy = startOfDayUTC(new Date());
  const desde = params.desde ? new Date(`${params.desde}T00:00:00.000Z`) : new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const hasta = params.hasta ? new Date(`${params.hasta}T00:00:00.000Z`) : hoy;

  const [gastos, proveedores] = await Promise.all([
    prisma.gasto.findMany({
      where: { fecha: { gte: desde, lte: hasta } },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      include: { proveedor: { select: { nombre: true } } },
    }),
    prisma.proveedor.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  const total = gastos.reduce((s, g) => s + g.valor, 0);

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="size-7" /> Gastos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {gastos.length} gastos · Total {total.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Listado</CardTitle>
            <CardDescription>Del {desde.toISOString().slice(0, 10)} al {hasta.toISOString().slice(0, 10)}</CardDescription>
          </CardHeader>
          <CardContent>
            <GastosTable
              gastos={gastos.map((g) => ({
                id: g.id,
                fecha: g.fecha.toISOString(),
                proveedor: g.proveedor.nombre,
                valor: g.valor,
                pagadoCon: g.pagadoCon,
                nota: g.nota,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nuevo gasto</CardTitle>
            <CardDescription>Registrá una compra de mercancía.</CardDescription>
          </CardHeader>
          <CardContent>
            <GastoForm proveedores={proveedores} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
