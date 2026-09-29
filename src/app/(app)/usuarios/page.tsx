import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsuarioForm, UsuarioList } from "./usuario-form";
import { Users } from "lucide-react";

export default async function UsuariosPage() {
  const session = await auth();
  const usuarios = await prisma.user.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="size-7 text-teal-600 dark:text-teal-400" />
          Usuarios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {usuarios.length} usuarios · {usuarios.filter((u) => u.activo).length} activos
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo usuario</CardTitle>
          <CardDescription>Contraseña mínima 8 caracteres.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsuarioForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <UsuarioList
            usuarios={usuarios.map((u) => ({
              id: u.id,
              nombre: u.nombre,
              email: u.email,
              role: u.role,
              activo: u.activo,
            }))}
            currentUserId={session?.user?.id ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
