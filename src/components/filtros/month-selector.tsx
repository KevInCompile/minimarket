"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  etiquetaPeriodo,
  fromISODate,
  mesRange,
  navegacionMes,
  periodoVisible,
} from "@/lib/dates";
import { muestraSelectorPeriodo } from "@/lib/nav";
import { cn } from "@/lib/utils";

export type MesOption = {
  /** Clave 'YYYY-MM'. Usa "all" para "Todos". */
  value: string;
  /** Etiqueta legible (ej. "Septiembre 2026"). */
  label: string;
};

/**
 * Selector de mes, con flechas de navegación.
 *
 * Se autoabastece de la URL: lee `mes` de los searchParams y calcula los
 * períodos vecinos. Eso permite ponerlo en la barra superior, que vive en
 * el layout (un server component que no se vuelve a renderizar al cambiar
 * la URL), sin que quede mostrando el mes viejo.
 *
 * - "Todos los meses" → limpia el filtro de fecha.
 * - Cualquier "YYYY-MM" → navega a ?mes=YYYY-MM (el server resuelve el rango).
 * - Las flechas saltan al período vecino del que se está viendo.
 */
export function MonthSelector({
  options,
  diaCorte = 1,
  hoy,
  className,
}: {
  /** Períodos con datos, para el dropdown. */
  options: MesOption[];
  /** Día de corte de la tienda (1-28). */
  diaCorte?: number;
  /**
   * Fecha de hoy en 'YYYY-MM-DD', calculada por el server. Se usa en vez
   * de `new Date()` para que el server y el browser coincidan siempre y no
   * haya mismatch de hidratación en el borde del corte.
   */
  hoy: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // El período visible sale de la URL. Con `?mes=` es explícito; sin rango
  // manual es el período en curso; con rango manual no hay un único
  // período, así que el selector queda en "Todos".
  const currentMes = useMemo(
    () =>
      periodoVisible(
        {
          mes: searchParams.get("mes"),
          desde: searchParams.get("desde"),
          hasta: searchParams.get("hasta"),
        },
        fromISODate(hoy),
        diaCorte,
      ),
    [searchParams, hoy, diaCorte],
  );

  // El rango visible, para calcular los vecinos cuando no hay `mes` explícito.
  const hasta = useMemo(() => {
    if (currentMes) {
      const rango = mesRange(currentMes, diaCorte);
      return rango?.hasta ?? fromISODate(hoy);
    }
    const hastaUrl = searchParams.get("hasta");
    return hastaUrl ? fromISODate(hastaUrl) : fromISODate(hoy);
  }, [currentMes, diaCorte, hoy, searchParams]);

  const nav = useMemo(
    () => navegacionMes(currentMes, hasta, diaCorte, fromISODate(hoy)),
    [currentMes, hasta, diaCorte, hoy],
  );

  // El selector solo aparece en las páginas cuyo contenido cambia con el
  // período. Las rutas administrativas se resuelven con pathname para no
  // depender de un layout que vuelve a renderizar en cada navegación.
  if (!muestraSelectorPeriodo(pathname)) return null;

  const irAMes = (key: string | null) => {
    if (!key) return;
    // Mantener el resto de los searchParams intactos (filtros específicos
    // por página, como proveedor, saleDe, etc.).
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", key);
    // Si hay mes seleccionado, no tiene sentido conservar desde/hasta
    // porque el rango se sobreescribe.
    params.delete("desde");
    params.delete("hasta");
    const qs = params.toString();
    startTransition(() =>
      router.push(qs ? `${pathname}?${qs}` : pathname),
    );
  };

  const handleChange = (raw: string | null) => {
    if (!raw) return;
    if (raw === "all") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("mes");
      const qs = params.toString();
      startTransition(() =>
        router.push(qs ? `${pathname}?${qs}` : pathname),
      );
      return;
    }
    irAMes(raw);
  };

  // Para evitar problemas con el Select (que renderiza un item por value),
  // usamos "all" como sentinela.
  const currentValue = currentMes ?? "all";

  return (
    <div className={cn("flex w-full items-center gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Mes anterior"
        title="Mes anterior"
        onClick={() => irAMes(nav.anterior)}
        className="shrink-0 text-muted-foreground"
      >
        <ChevronLeft />
      </Button>

      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger className="min-w-0 flex-1" aria-label="Mes">
          {/*
            Los items viven en un portal que solo se monta al abrir el
            dropdown, asi que `SelectValue` no puede resolver el id por
            su cuenta y mostraria la clave cruda ("2026-10"). Formateamos
            el valor explicitamente.
          */}
          <SelectValue>
            {(value: string | null) =>
              value === "all"
                ? "Todos los meses"
                : (options.find((o) => o.value === value)?.label ??
                  etiquetaPeriodo(value, diaCorte) ??
                  value)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los meses</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Mes siguiente"
        title="Mes siguiente"
        disabled={!nav.siguiente}
        onClick={() => irAMes(nav.siguiente)}
        className="shrink-0 text-muted-foreground"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
