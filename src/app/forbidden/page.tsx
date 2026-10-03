import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-sm font-medium text-muted-foreground">403</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Sin permisos</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No tiene permiso para ver esta sección. Si cree que es un error,
          contacte al administrador.
        </p>
        <div className="mt-6">
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
