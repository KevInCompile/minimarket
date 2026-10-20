import { prisma } from "@/lib/db";
import { PedidosView } from "./pedidos-view";

type PedidoViewRow = {
  id: string;
  proveedor: string;
  dia: string;
  estado: string | null;
  valor: number;
};

export default async function PedidosPage() {
  const pedidos = await prisma.pedidoNota.findMany({
    orderBy: [{ dia: "asc" }, { createdAt: "asc" }],
    include: { proveedor: { select: { nombre: true } } },
  });

  const total = pedidos.reduce((s, p) => s + p.valor, 0);

  const rows: PedidoViewRow[] = pedidos.map((p) => ({
    id: p.id,
    proveedor: p.proveedor.nombre,
    dia: p.dia,
    estado: p.estado,
    valor: p.valor,
  }));

  return <PedidosView pedidos={rows} total={total} />;
}