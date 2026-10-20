"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Filter } from "lucide-react";

/**
 * Barra de filtros reutilizable para páginas con listas.
 *
 * Estructura visual en dos bloques, con jerarquía clara:
 *
 *   ┌─ Navegación temporal ──────────────────────────┐
 *   │  Mes          │  Desde         │  Hasta        │
 *   └────────────────────────────────────────────────┘
 *   ┌─ Filtros específicos ───────┬─ Acciones ──────┐
 *   │  Proveedores │ Buscar │ ☐   │  Limpiar │Filtrar│
 *   └─────────────────────────────┴─────────────────┘
 *
 * Por eso los botones NO compiten por espacio con los filtros: viven
 * en una celda propia, separada por un borde vertical en desktop.
 *
 * Server-friendly: la page calcula los filtros efectivos (desde, hasta,
 * mes) y los pasa como props. Al hacer submit, navega con la nueva query
 * string. Los searchParams que no controla esta barra se preservan.
 */
export function FiltrosBar({
  desde,
  hasta,
  mes,
  children,
  showDates = true,
  /** Selector de mes. Se renderiza en la fila de navegación temporal. */
  mesSelector,
}: {
  desde: Date;
  hasta: Date;
  mes: string | null;
  /** Filtros específicos por página. */
  children?: ReactNode;
  /** Mostrar los datepickers desde/hasta. Por defecto true. */
  showDates?: boolean;
  /** Selector de mes (típicamente <MonthSelector />). */
  mesSelector?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [desdeStr, setDesdeStr] = useState(toInputDate(desde));
  const [hastaStr, setHastaStr] = useState(toInputDate(hasta));

  useEffect(() => {
    setDesdeStr(toInputDate(desde));
    setHastaStr(toInputDate(hasta));
  }, [desde, hasta]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const params = new URLSearchParams(searchParams.toString());

    const newDesde = formData.get("desde")?.toString() ?? "";
    const newHasta = formData.get("hasta")?.toString() ?? "";

    // Si el usuario tocó las fechas, mandan sobre el atajo de mes.
    if (newDesde || newHasta) {
      params.delete("mes");
      params.set("desde", newDesde);
      params.set("hasta", newHasta);
    }

    // Recolectamos los campos específicos. Primero limpiamos las keys que
    // el propio slot usa, luego re-agregamos solo lo que venga con valor.
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
  };

  const reset = () => {
    const params = new URLSearchParams(searchParams.toString());
    // Limpia las keys de navegación temporal.
    params.delete("mes");
    params.delete("desde");
    params.delete("hasta");
    // Limpia también los filtros específicos queogonven del slot: los
    // borramos leyendo el FormData del form (sus inputs vienen vacíos
    // cuando el estado se resetea, pero por seguridad los borramos todos).
    const form = document.querySelector("form") as HTMLFormElement | null;
    if (form) {
      for (const key of new FormData(form).keys()) {
        if (key !== "mes") params.delete(key);
      }
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const hasActiveFilters = searchParams.toString().length > 0;

  return (
    <form method="GET" onSubmit={submit} className="flex flex-col gap-4">
      {/* ── Fila 1: navegación temporal ── */}
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

      {/* ── Fila 2: filtros específicos + acciones ── */}
      {children && (
        <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
          {/* Filtros específicos (proveedor, tipo, búsqueda, agrupar…) */}
          {children}

          {/* Acciones: celda propia, separada por borde vertical en desktop.
              El `ml-auto` va SOLO aquí para empujar al extremo derecho. */}
          <div
            className="flex items-center gap-2 md:ml-auto md:pl-4 md:border-l
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
            <Button type="submit" size="sm">
              <Filter className="size-3.5" />
              Filtrar
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

/** Etiqueta + helper wrapper para los campos de la barra. */
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

/** Convierte Date UTC a 'YYYY-MM-DD' (input[type=date]). */
function toInputDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}