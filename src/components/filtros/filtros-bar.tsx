"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Filter, X, Check } from "lucide-react";

/**
 * Barra de filtros reutilizable para páginas con listas.
 *
 * Diseño:
 * - En desktop: una sola fila horizontal con todos los campos
 *   (mes, fechas, slot, acciones).
 * - En mobile: stack vertical agrupado por secciones.
 *
 * Server-friendly: la page calcula los filtros efectivos (desde, hasta,
 * mes) y los pasa como props. La barra renderiza un <form method="GET">
 * con los datepickers y un slot `children` para filtros específicos.
 * Al hacer submit, navega con la nueva query string. Los demás
 * searchParams que no controla esta barra se preservan.
 */
export function FiltrosBar({
  desde,
  hasta,
  mes,
  children,
  showDates = true,
}: {
  desde: Date;
  hasta: Date;
  mes: string | null;
  /** Filtros específicos por página. */
  children?: ReactNode;
  /** Mostrar los datepickers desde/hasta. Por defecto true. */
  showDates?: boolean;
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

    if (newDesde || newHasta) {
      // Si hay fechas manuales, el mes no aplica.
      params.delete("mes");
      params.set("desde", newDesde);
      params.set("hasta", newHasta);
    }

    // Los inputs del slot children viajan en el FormData. Algunos son
    // multi-valor (multi-select emite un input por valor). Usamos append
    // para preservarlos como múltiples entradas separadas en la URL.
    for (const [key, value] of formData.entries()) {
      if (key === "desde" || key === "hasta") continue;
      const s = value.toString();
      if (s === "" || s == null) {
        params.delete(key);
      } else {
        // Si ya existe (e.g. multi-select con varios valores), agregamos uno más.
        params.append(key, s);
      }
    }

    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    router.push(url);
  };

  const reset = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("mes");
    params.delete("desde");
    params.delete("hasta");
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    router.push(url);
  };

  const hasActiveFilters =
    !!mes ||
    searchParams.toString().length > 0;

  return (
    <form
      method="GET"
      onSubmit={submit}
      className="flex flex-col gap-3"
    >
      {/* Fila 1: fechas y slot children */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
        {showDates && (
          <>
            <Field label="Desde">
              <Input
                type="date"
                name="desde"
                value={desdeStr}
                onChange={(e) => setDesdeStr(e.target.value)}
                className="w-full md:w-[160px]"
              />
            </Field>
            <Field label="Hasta">
              <Input
                type="date"
                name="hasta"
                value={hastaStr}
                onChange={(e) => setHastaStr(e.target.value)}
                className="w-full md:w-[160px]"
              />
            </Field>
          </>
        )}

        {children}

        {/* Si hay mes seleccionado, lo pasamos como hidden para que se
            mantenga en la URL al aplicar filtros específicos. */}
        {mes && <input type="hidden" name="mes" value={mes} />}

        {/* Acciones */}
        <div className="ml-auto flex items-end gap-2">
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
    </form>
  );
}

/** Etiqueta + helper wrapper para los campos de la barra. */
function Field({
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

export { Field };

/** Convierte Date UTC a 'YYYY-MM-DD' (input[type=date]). */
function toInputDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
