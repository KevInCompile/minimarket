"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Filter, SlidersHorizontal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseMesLabel } from "@/lib/dates";

/**
 * Barra de filtros reutilizable para páginas con listas.
 *
 * Comportamiento responsive:
 *  - **Desktop (md+)**: siempre expandida. La página entera del filtro se
 *    muestra en una o dos filas.
 *  - **Mobile**: colapsada por defecto. Muestra un resumen corto (mes
 *    actual o rango) + botón "Filtros" con badge de cuántos filtros
 *    específicos están activos. Tocar expande.
 *
 * Estructura visual (expandida):
 *   ┌─ Navegación temporal ──────────────────────────┐
 *   │  Mes          │  Desde         │  Hasta        │
 *   └────────────────────────────────────────────────┘
 *   ┌─ Filtros específicos ───────┬─ Acciones ──────┐
 *   │  Proveedores │ Buscar │ ☐   │  Limpiar │Filtrar│
 *   └─────────────────────────────┴─────────────────┘
 */
export function FiltrosBar({
  desde,
  hasta,
  mes,
  children,
  showDates = true,
  mesSelector,
  onApplied,
  alwaysExpanded = false,
}: {
  desde: Date;
  hasta: Date;
  mes: string | null;
  children?: ReactNode;
  showDates?: boolean;
  mesSelector?: ReactNode;
  /** Se invoca al final de `submit()` y de `reset()`, después de `router.push`. */
  onApplied?: () => void;
  /** `true` omite el resumen colapsable de mobile: el panel se ve siempre. */
  alwaysExpanded?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [desdeStr, setDesdeStr] = useState(toInputDate(desde));
  const [hastaStr, setHastaStr] = useState(toInputDate(hasta));
  // Estado de expansion mobile. En desktop el panel se ve siempre.
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    setDesdeStr(toInputDate(desde));
    setHastaStr(toInputDate(hasta));
  }, [desde, hasta]);

  // Cuántos filtros específicos (no temporales) están activos.
  // Usado para el badge del botón "Filtros" en mobile.
  const filtrosActivosCount = useMemo(() => {
    const TEMPORALES = new Set(["mes", "desde", "hasta"]);
    let n = 0;
    for (const k of searchParams.keys()) {
      if (!TEMPORALES.has(k)) n += 1;
    }
    return n;
  }, [searchParams]);

  // Resumen corto para el estado colapsado en mobile.
  const resumen = useMemo(() => {
    if (mes) return parseMesLabel(mes) ?? mes;
    return `${formatShort(desde)} – ${formatShort(hasta)}`;
  }, [mes, desde, hasta]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const params = new URLSearchParams(searchParams.toString());

    const newDesde = formData.get("desde")?.toString() ?? "";
    const newHasta = formData.get("hasta")?.toString() ?? "";

    if (newDesde || newHasta) {
      params.delete("mes");
      params.set("desde", newDesde);
      params.set("hasta", newHasta);
    }

    for (const [key, value] of formData.entries()) {
      if (key === "desde" || key === "hasta") continue;
      const s = value.toString();
      if (s === "" || s == null) {
        params.delete(key);
      } else if (!params.getAll(key).includes(s)) {
        params.append(key, s);
      }
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setExpandido(false);
    onApplied?.();
  };

  const reset = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("mes");
    params.delete("desde");
    params.delete("hasta");
    const form = document.querySelector("form") as HTMLFormElement | null;
    if (form) {
      for (const key of new FormData(form).keys()) {
        if (key !== "mes") params.delete(key);
      }
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setExpandido(false);
    onApplied?.();
  };

  const hasActiveFilters = searchParams.toString().length > 0;

  return (
    <form
      method="GET"
      onSubmit={submit}
      className="flex flex-col gap-3"
    >
      {/* ── Mobile: resumen colapsado (omitido con alwaysExpanded) ── */}
      {!alwaysExpanded && (
        <div className="md:hidden flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Período
            </p>
            <p className="text-sm font-medium truncate">{resumen}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpandido((v) => !v)}
            className="relative shrink-0"
          >
            <SlidersHorizontal className="size-3.5" />
            Filtros
            {filtrosActivosCount > 0 && (
              <span
                className="ml-1 inline-flex h-4 min-w-4 items-center justify-center
                           rounded-full bg-primary px-1 text-[10px] font-semibold
                           text-primary-foreground"
              >
                {filtrosActivosCount}
              </span>
            )}
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                expandido && "rotate-180",
              )}
            />
          </Button>
        </div>
      )}

      {/* ── Bloque expandible (mobile) / siempre visible (desktop) ── */}
      <div
        className={cn(
          "flex flex-col gap-4",
          // Mobile: oculto si no esta expandido.
          !alwaysExpanded && !expandido && "hidden",
          // Desktop: siempre visible (override).
          !alwaysExpanded && "md:flex",
        )}
      >
        {/* Fila 1: navegación temporal */}
        {(mesSelector || showDates) && (
          <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
            {mesSelector && (
              <Field label="Mes" className="min-w-[160px] md:min-w-[180px]">
                {mesSelector}
              </Field>
            )}
            {showDates && (
              <>
                <Field label="Desde" className="min-w-[140px] md:w-[160px]">
                  <Input
                    type="date"
                    name="desde"
                    value={desdeStr}
                    onChange={(e) => setDesdeStr(e.target.value)}
                    className="w-full"
                  />
                </Field>
                <Field label="Hasta" className="min-w-[140px] md:w-[160px]">
                  <Input
                    type="date"
                    name="hasta"
                    value={hastaStr}
                    onChange={(e) => setHastaStr(e.target.value)}
                    className="w-full"
                  />
                </Field>
              </>
            )}
          </div>
        )}

        {/* Fila 2: filtros específicos + acciones */}
        {children && (
          <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
            {children}

            <div
              className="flex w-full items-center gap-2 md:ml-auto md:w-auto md:pl-4 md:border-l
                         md:border-border"
            >
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="text-muted-foreground"
                >
                  <X className="size-3.5" />
                  Limpiar
                </Button>
              )}
              <Button type="submit" size="sm" className="flex-1 md:flex-none">
                <Filter className="size-3.5" />
                Filtrar
              </Button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-xs font-medium text-muted-foreground px-0.5">
        {label}
      </span>
      {children}
    </div>
  );
}

function toInputDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Formato corto 'DD/MM/YY' en UTC. */
function formatShort(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}