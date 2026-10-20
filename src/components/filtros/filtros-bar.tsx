"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Barra de filtros reutilizable para páginas con listas.
 *
 * Server-friendly: la page calcula los filtros efectivos (desde, hasta,
 * mes) y los pasa como props. La barra renderiza un <form method="GET">
 * con los datepickers y un slot `children` para filtros específicos
 * por página (proveedor, tipo de pago, búsqueda, etc.).
 *
 * Al hacer submit, navega con la nueva query string. Los demás
 * searchParams (que no controla esta barra) se preservan.
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

  // Sincronizar inputs cuando cambian los filtros efectivos.
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

    // Si hay fechas nuevas, limpiamos `mes` (los datepickers mandan).
    if (newDesde && newHasta) {
      params.delete("mes");
      params.set("desde", newDesde);
      params.set("hasta", newHasta);
    } else if (newDesde || newHasta) {
      // Solo una fecha: deja la otra como está o limpia según el caso.
      params.set("desde", newDesde);
      params.set("hasta", newHasta);
    }

    // Los inputs ocultos del slot children también viajaron en el form.
    // Iteramos cada entrada del formData para preservar filtros específicos
    // (proveedor, saleDe, q, etc.) — los inputs nombrados con misma key se
    // agregan como múltiples valores; usamos setAll.
    for (const [key, value] of formData.entries()) {
      if (key === "desde" || key === "hasta") continue;
      const s = value.toString();
      if (s === "" || s == null) {
        params.delete(key);
      } else {
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
    // Limpia los filtros específicos (best-effort: cualquier clave que el
    // children haya inyectado se mantiene — el reset limpia solo lo básico).
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    router.push(url);
  };

  return (
    <form
      method="GET"
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3"
    >
      {showDates && (
        <>
          <div className="space-y-1">
            <label
              htmlFor="filtros-desde"
              className="text-xs font-medium text-muted-foreground"
            >
              Desde
            </label>
            <Input
              id="filtros-desde"
              type="date"
              name="desde"
              value={desdeStr}
              onChange={(e) => setDesdeStr(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="filtros-hasta"
              className="text-xs font-medium text-muted-foreground"
            >
              Hasta
            </label>
            <Input
              id="filtros-hasta"
              type="date"
              name="hasta"
              value={hastaStr}
              onChange={(e) => setHastaStr(e.target.value)}
              className="w-[150px]"
            />
          </div>
        </>
      )}

      {/* Si hay mes seleccionado, lo pasamos como hidden para que se mantenga
          en la URL al aplicar solo filtros específicos. */}
      {mes && <input type="hidden" name="mes" value={mes} />}

      {children}

      <div className="flex items-end gap-2">
        <Button type="submit" variant="default" size="sm">
          Aplicar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={reset}
        >
          Limpiar
        </Button>
      </div>
    </form>
  );
}

/** Convierte Date UTC a 'YYYY-MM-DD' (input[type=date]). */
function toInputDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
