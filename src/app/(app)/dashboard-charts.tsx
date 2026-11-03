"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "cn";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mesRange, periodoKeyDe, toISODate } from "@/lib/dates";
import { formatCOP, formatPercent } from "@/lib/format";
import type { PuntoMes } from "@/lib/calc";
import { BotonKebab } from "@/components/boton-kebab";

/**
 * Gráficos del dashboard.
 *
 * Todos son client components porque dependen de recharts. Los colores de las
 * barras mudas y del acento usan variables CSS (`var(--muted)`,
 * `var(--primary)`) para que el contraste se invierta solo en dark mode; la
 * paleta categórica de los donuts usa hex, igual que `proveedores-chart.tsx`.
 */

const COLOR_BARRA_MUDA = "var(--muted)";
const COLOR_ACENTO = "var(--primary)";
const COLOR_SKY = "#0284c7";
const COLOR_VIOLETA = "#8b5cf6";
const COLOR_AMARILLO = "#f59e0b";

const COMPACTO = new Intl.NumberFormat("es-CO", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type Porcion = {
  key: string;
  label: string;
  valor: number;
  color: string;
};

// ---------------------------------------------------------------------------
// Selector de periodo
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

type PresetPeriodo = {
  id: string;
  etiqueta: string;
  rango: (hoy: Date, diaCorte: number) => { desde: Date; hasta: Date };
};

/**
 * Los mismos atajos que usan las páginas con filtros, pero sobre el rango
 * `desde`/`hasta` que ya entiende el dashboard. Cambiar el periodo navega por
 * la URL, así que el servidor vuelve a calcular los totales.
 */
const PRESETES: PresetPeriodo[] = [
  {
    id: "mes",
    etiqueta: "Este período",
    // Del inicio del período en curso hasta hoy. Con corte 1 el período es
    // el mes calendario; con corte 15 va del 15 del mes anterior.
    rango: (hoy, diaCorte) => ({
      desde: mesRange(periodoKeyDe(hoy, diaCorte), diaCorte)?.desde ?? hoy,
      hasta: hoy,
    }),
  },
  {
    id: "30d",
    etiqueta: "Últimos 30 días",
    rango: (hoy) => ({
      desde: new Date(hoy.getTime() - 29 * MS_PER_DAY),
      hasta: hoy,
    }),
  },
  {
    id: "3m",
    etiqueta: "Últimos 3 períodos",
    rango: (hoy, diaCorte) => ({
      desde: inicioDePeriodos(hoy, diaCorte, 2),
      hasta: hoy,
    }),
  },
  {
    id: "12m",
    etiqueta: "Últimos 12 períodos",
    rango: (hoy, diaCorte) => ({
      desde: inicioDePeriodos(hoy, diaCorte, 11),
      hasta: hoy,
    }),
  },
];

/**
 * Inicio del período que está `cuantos` períodos antes del que contiene
 * `hoy`. Con corte 1 es el día 1 de ese mes; con corte 15, el día 15.
 */
function inicioDePeriodos(hoy: Date, diaCorte: number, cuantos: number): Date {
  const clave = periodoKeyDe(hoy, diaCorte);
  const [anio, mes] = clave.split("-").map(Number);
  // OJO: la clave es 1-based y Date.UTC cuenta desde 0.
  return new Date(Date.UTC(anio, mes - 1 - cuantos, diaCorte));
}
function SelectorPeriodo({
  desde,
  hasta,
  hoy,
  mes,
  diaCorte = 1,
}: {
  desde: string;
  hasta: string;
  hoy: string;
  /**
   * Clave 'YYYY-MM' del atajo de mes en la URL. Cuando está, el periodo
   * visible es el mes calendario completo (no un preset).
   */
  mes?: string | null;
  /** Dia de corte de la tienda (1-28), para que los presets usen periodos. */
  diaCorte?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // `hoy` llega del servidor como 'YYYY-MM' para que el cálculo sea idéntico
  // en servidor y cliente (sin hydration mismatch por zona horaria).
  const hoyDate = new Date(`${hoy}T00:00:00.000Z`);

  // Un preset sólo puede quedar marcado si su rango es EXACTAMENTE el
  // periodo que se está viendo. Con `?mes=YYYY-MM` el periodo es el mes
  // calendario completo, así que un preset que corta en "hoy" ("Este mes",
  // "Últimos 30 días", …) no debe quedar marcado: mentaría sobre el rango.
  const activo = PRESETES.find((p) => {
    const r = p.rango(hoyDate, diaCorte);
    if (toISODate(r.desde) !== desde || toISODate(r.hasta) !== hasta) return false;
    if (!mes) return true;
    // Con mes explícito sólo vale un preset que cubra el periodo entero.
    const rangoMes = mesRange(mes, diaCorte);
    return (
      rangoMes !== null &&
      toISODate(rangoMes.desde) === desde &&
      toISODate(rangoMes.hasta) === hasta
    );
  });

  const handleChange = (raw: string | null) => {
    const preset = PRESETES.find((p) => p.id === raw);
    if (!preset) return;
    const r = preset.rango(hoyDate, diaCorte);
    // Se conservan los demás parámetros de la URL, pero el atajo de mes se
    // borra: `mes` tiene prioridad sobre `desde`/`hasta` al resolver los
    // filtros en el servidor, así que si se queda el preset no cambiaría nada.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("mes");
    params.set("desde", toISODate(r.desde));
    params.set("hasta", toISODate(r.hasta));
    const qs = params.toString();
    startTransition(() => router.push(`/?${qs}`));
  };

  return (
    <Select value={activo?.id ?? ""} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="w-auto min-w-32" aria-label="Periodo">
        {/*
          Los items viven en un portal que sólo se monta al abrir el dropdown,
          así que `SelectValue` nunca resuelve el id → etiqueta por su cuenta y
          acabaría mostrando "mes". Formateamos el valor explícitamente.
        */}
        <SelectValue>
          {(value: string | null) =>
            PRESETES.find((p) => p.id === value)?.etiqueta ??
            `${desde} → ${hasta}`
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PRESETES.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Evolución mensual (12 barras)
// ---------------------------------------------------------------------------

export function EvolucionMensual({
  data,
  desde,
  hasta,
  hoy,
  mes,
  diaCorte = 1,
  className,
}: {
  data: PuntoMes[];
  desde: string;
  hasta: string;
  hoy: string;
  /** Clave 'YYYY-MM' del atajo de mes en la URL (null si no aplica). */
  mes?: string | null;
  /** Dia de corte de la tienda (1-28). */
  diaCorte?: number;
  className?: string;
}) {
  const total = data.reduce((s, p) => s + p.total, 0);
  const maximo = data.reduce((m, p) => (p.total > m ? p.total : m), 0);
  const hayDatos = maximo > 0;

  return (
    <Card className={cn("border-border shadow-sm", className)}>
      <CardHeader className="grid-cols-[1fr_auto_auto] items-center gap-3">
        <div className="min-w-0">
          <CardTitle>Evolución de ventas</CardTitle>
          <CardDescription>Movimiento por mes</CardDescription>
        </div>
        <SelectorPeriodo
          desde={desde}
          hasta={hasta}
          hoy={hoy}
          mes={mes}
          diaCorte={diaCorte}
        />
        <CardAction className="col-start-3 row-start-1">
          <BotonKebab titulo="Evolución de ventas" />
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground xl:text-3xl">
            {formatCOP(total)}
          </span>
          <span className="text-sm text-muted-foreground">Total de ventas</span>
        </div>

        {hayDatos ? (
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 16, right: 8, bottom: 4, left: 0 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tickFormatter={(v) => COMPACTO.format(v)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const punto = payload[0].payload as PuntoMes;
                    return (
                      <div className="rounded-md border bg-popover p-2 text-xs shadow-md">
                        <div className="text-muted-foreground capitalize">{label}</div>
                        <div className="font-medium tabular-nums">
                          {formatCOP(punto.total)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {data.map((p) => (
                    <Cell
                      key={p.key}
                      fill={
                        hayDatos && p.total === maximo
                          ? COLOR_ACENTO
                          : COLOR_BARRA_MUDA
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Sin movimientos registrados en el periodo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Donuts (gastos por forma de pago / retiros por origen)
// ---------------------------------------------------------------------------

function PanelDonut({
  titulo,
  descripcion,
  porciones,
  etiquetaTotal,
  className,
}: {
  titulo: string;
  descripcion: string;
  porciones: Porcion[];
  etiquetaTotal: string;
  className?: string;
}) {
  const total = porciones.reduce((s, p) => s + p.valor, 0);
  const hayDatos = total !== 0;

  // El hover vive en las filas del resumen, no en un tooltip flotante sobre
  // el grafico: un tooltip sigue al cursor y terminaba encima del valor del
  // hueco. Resaltar el sector desde la fila evita el solapamiento por
  // construccion y ademas funciona con el dedo en movil.
  const [indiceActivo, setIndiceActivo] = useState<number | null>(null);
  const valorCentro = formatCOP(total);
  // El hueco mide ~100px y el padding se come 24px. Un valor de 7+ digitos
  // no cabe en 16px, asi que el tamano baja por pasos segun la longitud.
  const tamanoCentro =
    valorCentro.length > 13 ? "text-xs" : valorCentro.length > 10 ? "text-sm" : "text-base";

  return (
    <Card className={cn("border-border shadow-sm", className)}>
      <CardHeader className="grid-cols-[1fr_auto] items-center">
        <div className="min-w-0">
          <CardTitle>{titulo}</CardTitle>
          <CardDescription>{descripcion}</CardDescription>
        </div>
        <CardAction>
          <BotonKebab titulo={titulo} />
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col items-center justify-center gap-5">
          {/* El donut y, debajo, el resumen por color. */}
          <div className="flex w-full shrink-0 flex-col items-center gap-3 sm:w-44">
            {hayDatos ? (
            <div className="relative w-full shrink-0 sm:w-40">
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={porciones}
                      dataKey="valor"
                      nameKey="label"
                      innerRadius="58%"
                      outerRadius="90%"
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {porciones.map((p, i) => (
                        <Cell
                          key={p.key}
                          fill={p.color}
                          stroke={i === indiceActivo ? "var(--foreground)" : "none"}
                          strokeWidth={i === indiceActivo ? 2 : 0}
                          onMouseEnter={() => setIndiceActivo(i)}
                          onMouseLeave={() => setIndiceActivo(null)}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* El total va en el hueco del donut: HTML encima del SVG, para
                  que no dependamos del API de labels de recharts. */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2">
                <span
                  className={`max-w-full truncate font-bold tabular-nums leading-tight ${tamanoCentro}`}
                >
                  {valorCentro}
                </span>
                <span className="mt-0.5 max-w-full truncate text-[10px] text-muted-foreground">
                  {etiquetaTotal}
                </span>
              </div>
            </div>
          ) : (
            <p className="flex h-40 w-full shrink-0 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground sm:w-40">
              Sin datos
            </p>
          )}

          {/* Resumen por color debajo del grafico. Cada fila resaltala sector
              correspondiente del donut, asi que no hace falta tooltip
              flotante. En movil el mismo gesto con el dedo la resalta. */}
          <ul className="flex w-full flex-col gap-1">
            {porciones.map((p, i) => {
              const activo = i === indiceActivo;
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onMouseEnter={() => setIndiceActivo(i)}
                    onMouseLeave={() => setIndiceActivo(null)}
                    onFocus={() => setIndiceActivo(i)}
                    onBlur={() => setIndiceActivo(null)}
                    onClick={() =>
                      setIndiceActivo(activo ? null : i)
                    }
                    aria-pressed={activo}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                      activo ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {p.label}
                    </span>
                    {/* El importe aparece al resaltar, en el hueco de la fila
                        sin desplazar el porcentaje. */}
                    <span
                      className={cn(
                        "w-0 shrink-0 overflow-hidden text-right text-xs tabular-nums transition-all",
                        activo ? "w-20 opacity-100" : "w-0 opacity-0",
                      )}
                    >
                      {formatCOP(p.valor)}
                    </span>
                    <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums">
                      {formatPercent(total === 0 ? 0 : p.valor / total, 1)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function GastosPorFormaDePago({
  gastosCaja,
  gastosEfectivo,
  gastosTransferencia,
  className,
}: {
  gastosCaja: number;
  gastosEfectivo: number;
  gastosTransferencia: number;
  className?: string;
}) {
  return (
    <PanelDonut
      titulo="Gastos por forma de pago"
      descripcion="De dónde sale la plata"
      etiquetaTotal="Total gastos"
      className={className}
      porciones={[
        { key: "caja", label: "Caja", valor: gastosCaja, color: COLOR_AMARILLO },
        { key: "efectivo", label: "Efectivo", valor: gastosEfectivo, color: COLOR_SKY },
        {
          key: "transferencia",
          label: "Transferencia",
          valor: gastosTransferencia,
          color: COLOR_VIOLETA,
        },
      ]}
    />
  );
}

export function RetirosPorOrigen({
  retirosEfectivo,
  retirosTransferencia,
  retirosCaja,
  className,
}: {
  retirosEfectivo: number;
  retirosTransferencia: number;
  retirosCaja: number;
  className?: string;
}) {
  return (
    <PanelDonut
      titulo="Retiros por origen"
      descripcion="De dónde salió la plata"
      etiquetaTotal="Total retiros"
      className={className}
      porciones={[
        { key: "efectivo", label: "Efectivo", valor: retirosEfectivo, color: COLOR_SKY },
        {
          key: "transferencia",
          label: "Transferencia",
          valor: retirosTransferencia,
          color: COLOR_VIOLETA,
        },
        { key: "caja", label: "Caja", valor: retirosCaja, color: COLOR_AMARILLO },
      ]}
    />
  );
}