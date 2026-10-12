import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegistroForm } from "./registro-form";

export default function RegistroPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-900/40 px-4 py-8">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 text-center block"
        >
          <div className="inline-flex flex-col items-center gap-2">
            <div className="size-16 rounded-2xl bg-linear-to-br from-sky-600 to-blue-700 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
              M
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-linear-to-br from-sky-700 to-blue-800 dark:from-sky-400 dark:to-blue-500 bg-clip-text text-transparent">
              Mi Caja
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestión de caja diaria
            </p>
          </div>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Crear cuenta y tienda</CardTitle>
            <CardDescription>
              Configure su tienda y empiece a usar la app de inmediato.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegistroForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
