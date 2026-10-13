import { prisma } from "@/lib/db";
import { formatCOP } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StickyNote } from "lucide-react";
import { ResponsiveTable } from "@/components/responsive-table";

type PedidoView = {
  id: string;
  proveedor: string;
  dia: string;
  estado: string | null;
  valor: number;
};

export default async function PedidosPage() {
  const pedidos = await prisma.pedidoNota.findMany({
    orderBy: [{ dia: "asc" }, { createdAt: "asc" }],
    include: { proveedor: { select: { nombre: true } } },
  });

  const total = pedidos.reduce((s, p) => s + p.valor, 0);

  const rows: PedidoView[] = pedidos.map((p) => ({
    id: p.id,
    proveedor: p.proveedor.nombre,
    dia: p.dia,
    estado: p.estado,
    valor: p.valor,
  }));

  return (
    <div className="p-4 md:p-10 max-w-3xl">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <StickyNote className="size-7 text-pink-600 dark:text-pink-400" />
          Pedidos (nota)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Copiado tal cual de la hoja suelta. Es solo referencia: NO suma en el balance.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Pagos programados</CardTitle>
          <CardDescription>
            Total {formatCOP(total)} (no afecta cálculos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            rows={rows}
            rowKey={(p) => p.id}
            emptyMessage="Sin pedidos en la nota."
            columns={[
              {
                key: "proveedor",
                header: "Proveedor",
                cell: (p) => (
                  <span className="font-medium">{p.proveedor}</span>
                ),
              },
              {
                key: "dia",
                header: "Día",
                cell: (p) => <span>{p.dia}</span>,
              },
              {
                key: "estado",
                header: "Estado",
                cell: (p) =>
                  p.estado ? (
                    <Badge variant="outline" className="line-through font-normal">
                      {p.estado}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  ),
              },
              {
                key: "valor",
                header: "Valor",
                align: "right",
                cell: (p) => (
                  <span className="tabular-nums font-semibold">
                    {formatCOP(p.valor)}
                  </span>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
