"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatCOP } from "@/lib/format";
import { formatShortDate } from "@/lib/format";
import { diaSemana } from "@/lib/dates";
import { NequiRow } from "./nequi-row";

type NequiView = { id: string; fecha: string; total: number };

/**
 * Tabla inline editable de Nequi por día.
 * En mobile cada día se renderiza como una card apilada con el form.
 */
export function NequiTable({
  entries,
  desde,
  hasta,
}: {
  entries: NequiView[];
  desde: string;
  hasta: string;
}) {
  const dias: string[] = [];
  const start = new Date(desde);
  const end = new Date(hasta);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dias.push(new Date(d).toISOString().slice(0, 10));
  }
  dias.reverse();

  const byFecha = new Map(entries.map((e) => [e.fecha.slice(0, 10), e]));

  return (
    <>
      {/* Desktop: tabla */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Día</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dias.map((d) => {
              const entry = byFecha.get(d);
              return (
                <TableRow key={d}>
                  <TableCell className="text-sm">{diaSemana(new Date(d))}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatShortDate(new Date(d))}
                  </TableCell>
                  <TableCell>
                    <NequiRow fecha={d} initialTotal={entry?.total ?? 0} />
                    {entry && entry.total > 0 && (
                      <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                        guardado: {formatCOP(entry.total)}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {dias.map((d) => {
          const entry = byFecha.get(d);
          return (
            <Card key={d}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Día
                  </span>
                  <span className="text-sm">{diaSemana(new Date(d))}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Fecha
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatShortDate(new Date(d))}
                  </span>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">
                    Total recibido
                  </span>
                  <NequiRow fecha={d} initialTotal={entry?.total ?? 0} />
                </div>
                {entry && entry.total > 0 && (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    guardado: {formatCOP(entry.total)}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}