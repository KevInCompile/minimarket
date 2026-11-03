"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
// Import RELATIVO a propósito: Vitest no resuelve el alias "@/", y este
// módulo se prueba desde `tests/` (la parte pura de la decisión de navegar).
import { dateInRangeUTC, fromISODate, mesKey } from "../../lib/dates";

/**
 * Decisión de navegación al período de un registro recién guardado.
 *
 * El problema que resuelve: el usuario está viendo un mes (por ejemplo
 * noviembre) y guarda un registro de octubre. La página sigue mostrando
 * noviembre, así que el registro nuevo es invisible hasta que el usuario
 * busca a mano el mes anterior.
 *
 * La regla es simple y PURA (sin React, testeable):
 *   - si la fecha guardada NO está dentro del período visible → se navega
 *     al mes que la contiene;
 *   - si la fecha guardada YA está visible → no se navega (así el formulario
 *     de gastos con varias filas no se cierra mientras el usuario sigue
 *     escribiendo).
 */

/**
 * Clave 'YYYY-MM' del mes que contiene `fecha`.
 *
 * El cálculo es UTC, el mismo que usa el servidor para resolver `?mes=`:
 * así la clave que se pone en la URL abre exactamente el mismo período.
 */
export function mesDeFecha(fecha: Date): string {
  return mesKey(fecha);
}

/**
 * `true` si `fecha` cae dentro del rango visible [desde, hasta].
 *
 * La comparación es por DÍA (UTC) e incluye los dos bordes: el primer y el
 * último día del rango son parte del período.
 */
export function periodoContiene(
  fecha: Date,
  desde: Date,
  hasta: Date,
): boolean {
  return dateInRangeUTC(fecha, desde, hasta);
}

/**
 * `true` si hay que cambiar de período para que el registro se vea.
 *
 * Si no se conoce el período visible (el formulario no recibió `desde` /
 * `hasta`) NO se navega: es preferible no moverse antes que dejar al usuario
 * en una página que no espera.
 */
export function debeNavegar(
  fecha: Date,
  desde?: Date,
  hasta?: Date,
): boolean {
  if (!desde || !hasta) return false;
  return !periodoContiene(fecha, desde, hasta);
}

/**
 * URL del período que contiene una fecha guardada.
 *
 * Conserva el resto de los searchParams (filtros específicos de la página),
 * fija `mes` con el mes de la fecha y borra `desde`/`hasta`: el atajo de mes
 * manda sobre el rango manual.
 */
export function urlDelPeriodo(
  pathname: string,
  search: string,
  fecha: Date,
): string {
  const params = new URLSearchParams(search);
  params.set("mes", mesDeFecha(fecha));
  params.delete("desde");
  params.delete("hasta");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Hook de cliente que devuelve la función `irAlPeriodo(fechaISO)`.
 *
 * `fechaISO` es la fecha guardada ('YYYY-MM-DD'). La función navega al mes
 * que la contiene SOLO si esa fecha no estaba en el período visible
 * (`desde`/`hasta`, que llegan del server con el período que se está
 * viendo).
 */
export function useIrAlPeriodo({
  desde,
  hasta,
}: {
  desde?: Date;
  hasta?: Date;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  return useCallback(
    (fechaISO: string) => {
      if (!fechaISO) return;
      const fecha = fromISODate(fechaISO);
      if (Number.isNaN(fecha.getTime())) return;
      if (!debeNavegar(fecha, desde, hasta)) return;

      const url = urlDelPeriodo(pathname, searchParams.toString(), fecha);
      startTransition(() => router.push(url));
    },
    [desde, hasta, pathname, router, searchParams],
  );
}
