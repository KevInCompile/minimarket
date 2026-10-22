import type { ReactNode } from "react";
import type { PagadoCon, SaleDe, TipoRetiro } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

/**
 * Badge de estado reutilizable.
 *
 * Un solo lugar decide el color de cada concepto del dominio, para que
 * "Transferencia" se vea igual en gastos, retiros, transferencia y pedidos.
 * Las páginas nunca eligen colores a mano: piden el tono con `tonoDe*` y la
 * etiqueta con `ETIQUETA_*`.
 *
 * Los tonos usan los tokens del tema (`--info`, `--success`, `--warning`,
 * `--destructive`, `--chart-3`), así que el contraste se invierte solo en dark
 * mode sin reescribir las tablas.
 */

/** Tonos semánticos disponibles. */
export type EstadoTono =
  | "neutro"
  | "info"
  | "exito"
  | "alerta"
  | "peligro"
  | "destacado";

/**
 * Clases por tono: fondo tenue + texto en el color fuerte del mismo tono.
 *
 * `alerta` y `destacado` necesitan el par claro/oscuro porque su token claro
 * (`--warning`, `--chart-3`) es demasiado pálido para texto de 11px sobre
 * blanco: en light usamos la variante `-foreground` (o un paso más oscuro) y
 * en dark el token brillante.
 */
const CLASE_TONO: Record<EstadoTono, string> = {
  neutro: "bg-muted text-muted-foreground",
  info: "bg-info/10 text-info dark:bg-info/15",
  exito: "bg-success/10 text-success dark:bg-success/15",
  alerta:
    "bg-warning/20 text-warning-foreground dark:bg-warning/15 dark:text-warning",
  peligro: "bg-destructive/10 text-destructive dark:bg-destructive/15",
  destacado:
    "bg-chart-3/12 text-[oklch(0.44_0.2_300)] dark:bg-chart-3/20 dark:text-chart-3",
};

const CLASE_TAMANO = {
  sm: "h-5 px-2 text-[11px]",
  md: "h-6 px-2.5 text-xs",
} as const;

/**
 * Píldora de estado compacta. `tono` es obligatorio: quien la usa decide el
 * color a través de los helpers `tonoDe*` de este mismo archivo.
 */
export function StatusBadge({
  tono,
  children,
  size = "sm",
  className,
}: {
  tono: EstadoTono;
  children: ReactNode;
  /** `sm` (por defecto) para tablas; `md` para cabeceras o Legends. */
  size?: keyof typeof CLASE_TAMANO;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium whitespace-nowrap",
        CLASE_TAMANO[size],
        CLASE_TONO[tono],
        className,
      )}
    >
      {children}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Etiquetas en español. Antes se mostraba el enum crudo (TRANSFERENCIA) dentro
// del badge; estos mapas son la única fuente de las etiquetas visibles.
// ---------------------------------------------------------------------------

export const ETIQUETA_SALE_DE: Record<SaleDe, string> = {
  CAJA: "Caja",
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

export const ETIQUETA_PAGADO_CON: Record<PagadoCon, string> = {
  CAJA: "Caja",
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

export const ETIQUETA_TIPO_RETIRO: Record<TipoRetiro, string> = {
  ARRIENDO: "Arriendo",
  NOMINA: "Nómina",
  SERVICIOS: "Servicios",
  IMPUESTOS: "Impuestos",
  PRESTAMO: "Préstamo",
  RETIRO_PERSONAL: "Retiro personal",
  OTRO: "Otro",
};

// ---------------------------------------------------------------------------
// Tonos por valor de dominio. `Record<Enum, ...>` obliga a cubrir cada
// miembro del enum: si mañana agregan una forma de pago, esto no compila
// hasta que elija su tono y su etiqueta.
//
// CAJA queda en neutro a propósito: es la vía por defecto y merece gris. El
// ámbar está reservado para obligaciones (servicios, impuestos, préstamos),
// así un mismo color no significa dos cosas distintas en columnas vecinas.
// ---------------------------------------------------------------------------

const TONO_SALE_DE: Record<SaleDe, EstadoTono> = {
  CAJA: "neutro",
  EFECTIVO: "info",
  TRANSFERENCIA: "destacado",
};

const TONO_PAGADO_CON: Record<PagadoCon, EstadoTono> = {
  CAJA: "neutro",
  EFECTIVO: "info",
  TRANSFERENCIA: "destacado",
};

const TONO_TIPO_RETIRO: Record<TipoRetiro, EstadoTono> = {
  ARRIENDO: "neutro",
  NOMINA: "alerta",
  SERVICIOS: "alerta",
  IMPUESTOS: "alerta",
  PRESTAMO: "alerta",
  RETIRO_PERSONAL: "peligro",
  OTRO: "neutro",
};

/** Tono con el que se dibuja de dónde sale el dinero. */
export function tonoDeSaleDe(v: SaleDe): EstadoTono {
  return TONO_SALE_DE[v] ?? "neutro";
}

/** Tono con el que se dibuja la forma de pago de un gasto. */
export function tonoDePagadoCon(v: PagadoCon): EstadoTono {
  return TONO_PAGADO_CON[v] ?? "neutro";
}

/**
 * Tono con el que se dibuja el motivo de un retiro: rojo para lo personal,
 * ámbar para obligaciones y préstamos, gris para el resto.
 */
export function tonoDeTipoRetiro(v: TipoRetiro): EstadoTono {
  return TONO_TIPO_RETIRO[v] ?? "neutro";
}

// ---------------------------------------------------------------------------
// Pedidos: `estado` es texto libre copiado de la hoja suelta, no un enum.
// Buscamos palabras clave en vez de un enum para no romper con textos viejos.
// ---------------------------------------------------------------------------

const PALABRAS_TONO: { tono: EstadoTono; palabras: string[] }[] = [
  { tono: "peligro", palabras: ["cancel", "anul", "rechaz", "no se"] },
  { tono: "exito", palabras: ["entreg", "recib", "pag", "completo"] },
  { tono: "destacado", palabras: ["despach", "enviad", "en transito"] },
  { tono: "alerta", palabras: ["proces", "pendient", "esper", "falta"] },
];

function normalizar(v: string): string {
  // NFD separa los acentos y asi "préstamos" y "prestamos" comparan igual.
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Tono para un estado escrito a mano (pedidos). Sin coincidencia: neutro. */
export function tonoDeEstadoTexto(v: string): EstadoTono {
  const texto = normalizar(v);
  for (const { tono, palabras } of PALABRAS_TONO) {
    if (palabras.some((p) => texto.includes(p))) return tono;
  }
  return "neutro";
}