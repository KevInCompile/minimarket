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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50/60 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/30 px-4 py-8">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 text-center block"
        >
          <div className="inline-flex flex-col items-center gap-2">
            <div className="size-16 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
              m
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-linear-to-br from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              minimarket
            </h1>
            <p className="text-sm text-muted-foreground">
              Control de caja
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
