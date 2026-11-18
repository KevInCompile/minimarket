import { prisma } from "@/lib/db";
import { requireTiendaId } from "@/lib/auth-guard";
import { PrestamosView } from "./prestamos-view";
import {
  filtraPorEstado,
  ordenaPrestamos,
  parseEstadoFiltro,
  totalesPrestamos,
  type PrestamoResumen,
} from "@/lib/prestamos";

type Props = {
  searchParams: Promise<{
    /** `?estado=pendientes|pagados|todos`. */
    estado?: string | string[];
  }>;
};

export default async function PrestamosPage({ searchParams }: Props) {
  const tiendaId = await requireTiendaId();
  const params = await searchParams;
  const estado = parseEstadoFiltro(params.estado);

  const prestamos = await prisma.prestamo.findMany({
    where: { tiendaId },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });

  const rows: PrestamoResumen[] = prestamos.map((p) => ({
    id: p.id,
    fecha: p.fecha,
    persona: p.persona,
    valor: p.valor,
    nota: p.nota,
    pagado: p.pagado,
    fechaPago: p.fechaPago,
  }));

  const visibles = ordenaPrestamos(filtraPorEstado(rows, estado));
  const totales = totalesPrestamos(visibles);

  return (
    <PrestamosView
      prestamos={visibles}
      estado={estado}
      totales={totales}
    />
  );
}
