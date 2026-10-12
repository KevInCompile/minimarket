import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

type Props = {
  searchParams: Promise<{
    from?: string;
    expired?: string;
    inactive?: string;
    registrado?: string;
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { from, expired, inactive, registrado } = await searchParams;
  const session = await auth();
  if (session?.user) {
    redirect(from || "/");
  }

  const notice =
    expired === "1"
      ? "Su sesión quedó desactualizada (la base de datos fue reiniciada). Vuelva a iniciar sesión."
      : inactive === "1"
        ? "Su usuario fue desactivado. Contacte al administrador."
        : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-900/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto size-16 rounded-2xl bg-linear-to-br from-sky-600 to-blue-700 flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-4">
            M
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-br from-sky-700 to-blue-800 dark:from-sky-400 dark:to-blue-500 bg-clip-text text-transparent">
            Mi Caja
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestión de caja diaria
          </p>
        </div>

        {registrado === "1" && (
          <div className="mb-4 rounded-md border border-sky-300 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-700 px-3 py-2 text-sm text-sky-800 dark:text-sky-300">
            Cuenta creada con éxito. Inicie sesión.
          </div>
        )}

        {notice && (
          <div className="mb-4 rounded-md border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-300">
            {notice}
          </div>
        )}

        <LoginForm from={from ?? "/"} />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿No tiene cuenta?{" "}
          <Link
            href="/registro"
            className="text-sky-700 dark:text-sky-300 font-medium hover:underline"
          >
            Crear una tienda
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          ¿Tiene problemas para acceder? Contacte al administrador.
        </p>
      </div>
    </div>
  );
}
