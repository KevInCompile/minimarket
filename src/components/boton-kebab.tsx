"use client";

import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botón kebab decorativo, sólo affordance visual (como en el diseño de
 * referencia). Vive fuera de los gráficos para que las páginas de lista
 * puedan reutilizarlo sin arrastrar recharts.
 */
export function BotonKebab({
  titulo,
  className,
}: {
  titulo: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Más opciones de ${titulo}`}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <MoreHorizontal className="size-4" />
    </button>
  );
}