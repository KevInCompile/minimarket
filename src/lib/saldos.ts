import "server-only";
import { prisma } from "@/lib/db";

/**
 * Saldos acumulados al inicio de un período.
 *
 * El saldo acumulado de efectivo y de Transferencia es una CUENTA CORRIENTE:
 * si el 31 de octubre quedó en -45.000, el 1 de noviembre sigue en -45.000
 * antes de sumar lo que entre ese día. Por eso no se puede reiniciar en cero
 * al cambiar de período.
 *
 * El saldo inicial de un período es exactamente la suma de todo lo que pasó
 * antes de su primer día:
 *
 *   efectivo     = SUM(guardado) - SUM(gastos en efectivo) - SUM(retiros en efectivo)
 *   transferencia = SUM(recibido) - SUM(gastos en transferencia) - SUM(retiros en transferencia)
 *
 * Son agregados SQL indexados: no dependen del tamaño del historial.
 */
export type SaldoInicial = {
  efectivo: number;
  transferencia: number;
};

/**
 * Saldos acumulados de las dos cuentas justo ANTES de la fecha `hasta`.
 *
 * @param tiendaId Tienda cuyo saldo se calcula.
 * @param hasta FechaExclusive: los movimientos de ese día NO se incluyen.
 */
export async function saldosInicialesHasta(
  tiendaId: string,
  hasta: Date,
): Promise<SaldoInicial> {
  const antes = { tiendaId, fecha: { lt: hasta } };

  const [guardado, gastadoEfectivo, retiradoEfectivo, recibido, gastadoTransferencia, retiradoTransferencia] =
    await Promise.all([
      prisma.cierreDiario.aggregate({
        where: antes,
        _sum: { efectivoGuardado: true },
      }),
      prisma.gasto.aggregate({
        where: { ...antes, pagadoCon: "EFECTIVO" },
        _sum: { valor: true },
      }),
      prisma.retiro.aggregate({
        where: { ...antes, saleDe: "EFECTIVO" },
        _sum: { valor: true },
      }),
      prisma.transferenciaDia.aggregate({
        where: antes,
        _sum: { total: true },
      }),
      prisma.gasto.aggregate({
        where: { ...antes, pagadoCon: "TRANSFERENCIA" },
        _sum: { valor: true },
      }),
      prisma.retiro.aggregate({
        where: { ...antes, saleDe: "TRANSFERENCIA" },
        _sum: { valor: true },
      }),
    ]);

  return {
    efectivo:
      (guardado._sum.efectivoGuardado ?? 0) -
      (gastadoEfectivo._sum.valor ?? 0) -
      (retiradoEfectivo._sum.valor ?? 0),
    transferencia:
      (recibido._sum.total ?? 0) -
      (gastadoTransferencia._sum.valor ?? 0) -
      (retiradoTransferencia._sum.valor ?? 0),
  };
}
