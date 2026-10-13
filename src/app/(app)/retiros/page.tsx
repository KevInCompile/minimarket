import { prisma } from "@/lib/db";
import { RetirosView } from "./retiros-view";
import { startOfDayUTC } from "@/lib/dates";
import { requireTiendaId } from "@/lib/auth-guard";

type Props = {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
};

export default async function RetirosPage({ searchParams }: Props) {
  const params = await searchParams;
  const tiendaId = await requireTiendaId();
  const hoy = startOfDayUTC(new Date());
  const desde = params.desde
    ? new Date(`${params.desde}T00:00:00.000Z`)
    : new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const hasta = params.hasta ? new Date(`${params.hasta}T00:00:00.000Z`) : hoy;

  const retiros = await prisma.retiro.findMany({
    where: { tiendaId, fecha: { gte: desde, lte: hasta } },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="p-4 md:p-10 max-w-7xl">
      <RetirosView
        retiros={retiros.map((r) => ({
          id: r.id,
          fecha: r.fecha.toISOString(),
          tipo: r.tipo,
          concepto: r.concepto,
          valor: r.valor,
          saleDe: r.saleDe,
          nota: r.nota,
        }))}
      />
    </div>
  );
}
