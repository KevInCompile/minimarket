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
import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  hideOnMobile?: boolean;
};

type Field<T> = {
  key: string;
  label: React.ReactNode;
  render: (row: T) => React.ReactNode;
  fullWidth?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  fields?: Field<T>[];
  emptyMessage?: React.ReactNode;
  rowClassName?: (row: T) => string | undefined;
  /** clave única estable por fila */
  rowKey: (row: T, index: number) => string;
};

/**
 * Tabla responsive:
 *  - en desktop (`md:`+) renderiza <Table> clásica con columns
 *  - en mobile (`< md`) renderiza cards apiladas con fields
 *
 * Si no se pasan `fields`, en mobile renderiza solo las columnas no hidden.
 */
export function ResponsiveTable<T>({
  rows,
  columns,
  fields,
  emptyMessage = "Sin resultados.",
  rowClassName,
  rowKey,
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        {emptyMessage}
      </p>
    );
  }

  const visibleCols = columns.filter((c) => !c.hideOnMobile);
  const cardFields: Field<T>[] =
    fields ?? visibleCols.map((c) => ({ key: c.key, label: c.header, render: (row) => c.cell(row, rows.indexOf(row)) }));

  return (
    <>
      {/* Tabla: solo en md+ */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={cn(
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                  )}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={rowKey(row, i)}
                className={rowClassName?.(row)}
              >
                {columns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={cn(
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                    )}
                  >
                    {c.cell(row, i)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cards: solo en mobile */}
      <div className="md:hidden space-y-3">
        {rows.map((row, i) => (
          <Card key={rowKey(row, i)} className={rowClassName?.(row)}>
            <CardContent className="p-4 space-y-2">
              {cardFields.map((f) => (
                <div
                  key={f.key}
                  className={cn(
                    "flex justify-between items-baseline gap-2",
                    f.fullWidth && "block",
                  )}
                >
                  <span className="text-xs uppercase tracking-wide text-muted-foreground shrink-0">
                    {f.label}
                  </span>
                  <span className="text-sm text-right">{f.render(row)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}