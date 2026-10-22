"use client";

import { formatCOP } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, tonoDeEstadoTexto } from "@/components/status-badge";
import { StickyNote } from "lucide-react";
import { ResponsiveTable } from "@/components/responsive-table";

type PedidoView = {
  id: string;
  proveedor: string;
  dia: string;
  estado: string | null;
  valor: number;
};

/**
 * Vista de pedidos (nota).
 *
 * Es un Client Component porque `ResponsiveTable` recibe callbacks
 * (`rowKey`, `cell`) que no pueden cruzar el límite Server → Client.
 * La page (server) solo carga los datos y los pasa como props
 * serializables.
 */
export function PedidosView({
  pedidos,
  total,
}: {
  pedidos: PedidoView[];
  total: number;
}) {
  return (
    <div className="p-4 md:p-10 max-w-3xl">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <StickyNote className="size-7 text-pink-600 dark:text-pink-400" />
          Pedidos (nota)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Copiado tal cual de la hoja suelta. Es solo referencia: NO suma en
          el balance.
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
            rows={pedidos}
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
                    // Sin `line-through`: la píldora ya separa el estado del
                    // resto de la fila y el tachado lo volvía ilegible.
                    <StatusBadge tono={tonoDeEstadoTexto(p.estado)}>
                      {p.estado}
                    </StatusBadge>
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