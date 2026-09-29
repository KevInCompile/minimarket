"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { RankingProveedor } from "@/lib/calc";
import { formatCOP, formatPercent } from "@/lib/format";

const COLORS = [
  "#10b981", // emerald (primary)
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
];

export function ProveedoresChart({ data }: { data: RankingProveedor[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Sin datos para el periodo.
      </p>
    );
  }
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 12, right: 24, top: 4, bottom: 4 }}
        >
          <XAxis
            type="number"
            tickFormatter={(v) => formatCOP(v)}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            type="category"
            dataKey="proveedor"
            width={110}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload as RankingProveedor;
              return (
                <div className="rounded-md border bg-background p-3 shadow-sm text-sm">
                  <div className="font-medium">{item.proveedor}</div>
                  <div className="tabular-nums">{formatCOP(item.total)}</div>
                  <div className="text-muted-foreground">
                    {formatPercent(item.porcentaje, 1)}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
