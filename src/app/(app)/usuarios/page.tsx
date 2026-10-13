import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { requireTiendaId } from "@/lib/auth-guard";
import { UsuariosView } from "./usuarios-view";

export default async function UsuariosPage() {
  const [session, tiendaId] = await Promise.all([auth(), requireTiendaId()]);
  const usuarios = await prisma.user.findMany({
    where: { tiendaId },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });

  return (
    <div className="p-4 md:p-10 max-w-3xl">
      <UsuariosView
        usuarios={usuarios.map((u) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          role: u.role,
          activo: u.activo,
        }))}
        currentUserId={session?.user?.id ?? ""}
      />
    </div>
  );
}
