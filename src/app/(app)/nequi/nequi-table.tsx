"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCOP, formatShortDate } from "@/lib/format";
import { diaSemana } from "@/lib/dates";
import { NequiRow } from "./nequi-row";

type NequiView = { id: string; fecha: string; total: number };

export function NequiTable({
  entries,
  desde,
  hasta,
}: {
  entries: NequiView[];
  desde: string;
  hasta: string;
}) {
  // Construir todos los días del rango, marcando cuáles tienen registro.
  const dias: string[] = [];
  const start = new Date(desde);
  const end = new Date(hasta);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dias.push(new Date(d).toISOString().slice(0, 10));
  }
  dias.reverse();

  const byFecha = new Map(entries.map((e) => [e.fecha.slice(0, 10), e]));

  return (
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
              <TableCell className="text-sm">
                {diaSemana(new Date(d))}
              </TableCell>
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
  );
}
