import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProveedorForm, ProveedorList } from "./proveedor-form";
import { Truck } from "lucide-react";

export default async function ProveedoresPage() {
  const proveedores = await prisma.proveedor.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    include: {
      _count: { select: { gastos: true } },
    },
  });

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Truck className="size-7 text-orange-600 dark:text-orange-400" />
          Proveedores
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {proveedores.length} proveedores · {proveedores.filter((p) => p.activo).length} activos
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo proveedor</CardTitle>
          <CardDescription>Se autocompleta al registrar gastos.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProveedorForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <ProveedorList
            proveedores={proveedores.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              activo: p.activo,
              cantidadGastos: p._count.gastos,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
