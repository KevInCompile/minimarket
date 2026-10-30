"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/**
 * MultiSelect con Popover: reemplaza el <select multiple> nativo.
 *
 * El trigger muestra un resumen: "Proveedores" si vacío, "3 seleccionados"
 * si hay items, "Coca-Cola, Altipal +1" si los items caben en una línea.
 *
 * Los valores se guardan en un `<input type="hidden" name=` para que el
 * FiltrosBar los recoja del FormData igual que un select nativo.
 *
 * El input hidden usa comma-separated values (CSV) como convención,
 * y FiltrosBar/page los parsea con `.split(",").
 */
export function MultiSelect({
  options,
  value,
  onChange,
  name,
  emptyLabel = "Todos",
  className,
}: {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  /** name del input hidden; el FiltrosBar lo lee del FormData. */
  name: string;
  emptyLabel?: string;
  /** Texto mostrado cuando no hay nada seleccionado. */
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value;
  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .filter(Boolean);

  const label = (() => {
    if (selected.length === 0) return emptyLabel;
    if (selected.length <= 2) return selectedLabels.join(", ");
    return `${selectedLabels.slice(0, 2).join(", ")} +${selected.length - 2}`;
  })();

  const toggle = (v: string) => {
    onChange(
      selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v],
    );
  };

  const clear = () => onChange([]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm whitespace-nowrap outline-none select-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-open:border-ring data-open:ring-3 data-open:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50",
          className,
        )}
      >
        <span className="flex-1 truncate text-left font-normal">
          {label}
        </span>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Limpiar selección"
              className="rounded p-0.5 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
            >
              <X className="size-3 text-muted-foreground" />
            </span>
          )}
          <ChevronDown className="size-4 text-muted-foreground" />
        </div>
      </PopoverTrigger>

      {/* Inputs ocultos: uno por cada valor (multi-value form fields) */}
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}

      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--anchor-width)] min-w-[200px] p-1 max-h-72 overflow-y-auto"
      >
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1 p-1 pb-2 border-b mb-1">
            {selectedLabels.map((l, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">
                {l}
              </Badge>
            ))}
          </div>
        )}
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-2">
            Sin opciones.
          </p>
        ) : (
          options.map((o) => {
            const checked = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left outline-hidden transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:bg-accent focus-visible:text-accent-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {checked && <Check className="size-3" />}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })
        )}
      </PopoverContent>
    </Popover>
  );
}
