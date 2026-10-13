import { prisma } from "@/lib/db";
import { requireTiendaId } from "@/lib/auth-guard";
import { ProveedoresView } from "./proveedores-view";

export default async function ProveedoresPage() {
  const tiendaId = await requireTiendaId();
  const proveedores = await prisma.proveedor.findMany({
    where: { tiendaId },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    include: {
      _count: { select: { gastos: true } },
    },
  });

  return (
    <div className="p-4 md:p-10 max-w-3xl">
      <ProveedoresView
        proveedores={proveedores.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          activo: p.activo,
          cantidadGastos: p._count.gastos,
        }))}
      />
    </div>
  );
}
