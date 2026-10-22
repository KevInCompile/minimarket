"use client";

import {
  Fragment,
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Filter, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Props que el toolbar le inyecta al panel de filtros (`FiltrosBar`). */
type PanelControl = {
  /** Se llama al aplicar o limpiar filtros, para cerrar el Sheet. */
  onApplied?: () => void;
  /** `true` muestra el panel siempre expandido (dentro de un Sheet). */
  alwaysExpanded?: boolean;
};

/**
 * Toolbar compacto de página: bloque de título a la izquierda, grupo de
 * acciones a la derecha y un botón "Filtros" con borde que abre el panel de
 * filtros en un Sheet.
 *
 * Reemplaza el patrón de "tarjeta de filtros siempre visible":
 *
 *   ┌─ línea meta (subtitle) ────────────────────────────────┐
 *   │ Título                              [acciones] [Filtros 3]
 *   └───────────────────────────────────────────────────────────┘
 *
 * El panel de filtros se pasa como `children` y se renderiza dentro del
 * `Sheet`. Sin `children` no se renderiza el botón "Filtros" (páginas sin
 * filtros).
 *
 * El `Badge` cuenta solo filtros NO temporales (proveedor, búsqueda, agrupar
 * por mes). Los temporales (mes / desde / hasta) son el estado por defecto de
 * la lista, así que un badge por ellos solo distracte.
 */
export type PageToolbarProps = {
  /** Título de la página. Se renderiza como el `<h1>`. */
  title: string;
  /** Icono opcional a la izquierda del título. */
  icon?: LucideIcon;
  /** Clases extra para el icono (color, tamaño). */
  iconClassName?: string;
  /** Línea meta sobre el título (conteo, total). Se renderiza dentro de un
   *  `<p>`, así que pasa markup inline (`span`, fragmento), nunca bloques. */
  subtitle?: ReactNode;
  /** Acciones de página (ej. el `Sheet` de "Nuevo gasto"). Se renderizan en
   *  el grupo derecho, antes del botón "Filtros". */
  actions?: ReactNode;
  /** Cantidad de filtros activos. > 0 muestra el badge en el botón. */
  activeFilters?: number;
  /** Panel de filtros (un `<FiltrosBar>`). Va dentro del `Sheet` que abre el
   *  botón "Filtros". */
  children?: ReactNode;
};

export function PageToolbar({
  title,
  icon: Icon,
  iconClassName,
  subtitle,
  actions,
  activeFilters = 0,
  children,
}: PageToolbarProps) {
  // El toolbar controla el estado del Sheet: al aplicar (o limpiar) filtros
  // se cierra para que el usuario vea de una vez el resultado filtrado.
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {subtitle ? (
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
          {Icon ? (
            <Icon className={cn("size-6 shrink-0 md:size-7", iconClassName)} />
          ) : null}
          {title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {actions}

        {children ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={<Button variant="outline" size="sm" />}
              className="gap-1.5"
            >
              <Filter className="size-4" />
              Filtros
              {activeFilters > 0 ? (
                <Badge className="h-4 min-w-4 px-1 text-[10px] leading-none font-semibold">
                  {activeFilters}
                </Badge>
              ) : null}
            </SheetTrigger>

            <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle>Filtros</SheetTitle>
                <SheetDescription>
                  Período y filtros de la lista.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {conControlDelPanel(children, () => setOpen(false))}
              </div>
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Le inyecta al panel los dos controles que dependen del toolbar: `onApplied`
 * (cerrar el Sheet al aplicar) y `alwaysExpanded` (dentro del Sheet no hace
 * falta el resumen colapsable de mobile).
 *
 * Solo funciona si `children` es el `<FiltrosBar>` o un wrapper que reenvía
 * esas props. Con varios nodos, un fragmento o un elemento que no las acepta,
 * se devuelve el children tal cual.
 */
function conControlDelPanel(children: ReactNode, onApplied: () => void) {
  if (!isValidElement(children) || children.type === Fragment) {
    return children;
  }
  return cloneElement(children as ReactElement<PanelControl>, {
    onApplied,
    alwaysExpanded: true,
  });
}