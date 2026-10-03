import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

type Props = {
  searchParams: Promise<{ from?: string; expired?: string; inactive?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { from, expired, inactive } = await searchParams;
  const session = await auth();
  if (session?.user) {
    redirect(from || "/");
  }
  const notice =
    expired === "1"
      ? "Tu sesión quedó desactualizada (la base de datos fue reiniciada). Volvé a iniciar sesión."
      : inactive === "1"
        ? "Tu usuario fue desactivado. Contactá al administrador."
        : null;
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 via-teal-50/60 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto size-16 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-4">
            m
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-br from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
            minimarket
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control de caja
          </p>
        </div>
        {notice && (
          <div className="mb-4 rounded-md border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-300">
            {notice}
          </div>
        )}
        <LoginForm from={from ?? "/"} />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Problemas para entrar? Contactá al administrador.
        </p>
      </div>
    </div>
  );
}
