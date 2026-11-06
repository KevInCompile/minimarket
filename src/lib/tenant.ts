/**
 * Guardas de aislamiento entre tiendas.
 *
 * Una server action que recibe datos del cliente (por ejemplo el snapshot
 * de un "deshacer" tras borrar un gasto) no puede confiar en el `tiendaId`
 * que viene en ese payload: el cliente lo controla. Si se usa tal cual, un
 * usuario de la tienda A podría escribir una fila en la tienda B.
 *
 * La regla es simple: el `tiendaId` que manda la escritura es SIEMPRE el de
 * la sesión, y el del payload solo sirve para verificar que el snapshot
 * pertenece a esta tienda.
 */

/**
 * Indica si un snapshot recibido del cliente pertenece a la tienda de la
 * sesión.
 *
 * @param snapshotTiendaId `tiendaId` que viene en el payload del cliente.
 * @param sesionTiendaId `tiendaId` de la sesión actual.
 */
export function snapshotEsDeEstaTienda(
  snapshotTiendaId: string | null | undefined,
  sesionTiendaId: string,
): boolean {
  if (!snapshotTiendaId) return false;
  return snapshotTiendaId === sesionTiendaId;
}
