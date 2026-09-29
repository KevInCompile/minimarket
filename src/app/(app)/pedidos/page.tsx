import { prisma } from "@/lib/db";
import { formatCOP } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StickyNote } from "lucide-react";

export default async function PedidosPage() {
  const pedidos = await prisma.pedidoNota.findMany({
    orderBy: [{ dia: "asc" }, { createdAt: "asc" }],
    include: { proveedor: { select: { nombre: true } } },
  });

  const total = pedidos.reduce((s, p) => s + p.valor, 0);

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <StickyNote className="size-7" /> Pedidos (nota)
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Día</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    Sin pedidos en la nota.
                  </TableCell>
                </TableRow>
              )}
              {pedidos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.proveedor.nombre}
                  </TableCell>
                  <TableCell>{p.dia}</TableCell>
                  <TableCell>
                    {p.estado ? (
                      <Badge variant="outline" className="line-through font-normal">
                        {p.estado}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatCOP(p.valor)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
