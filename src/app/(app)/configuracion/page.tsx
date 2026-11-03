import { requireTienda } from "@/lib/auth-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings } from "lucide-react";
import { DiaCorteForm } from "./configuracion-view";
import { etiquetaPeriodo, periodoKeyDe } from "@/lib/dates";

export default async function ConfiguracionPage() {
  const tienda = await requireTienda();
  const { diaCorte } = tienda;

  // Un ejemplo de cómo queda el período actual con este corte.
  const hoy = new Date();
  const claveActual = periodoKeyDe(hoy, diaCorte);
  const ejemplo = etiquetaPeriodo(claveActual, diaCorte);

  return (
    <div className="p-4 md:p-10 max-w-3xl space-y-6">
      <header className="flex items-center gap-2">
        <Settings className="size-7 text-slate-600 dark:text-slate-400" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Configuración
          </h1>
          <p className="text-sm text-muted-foreground">
            Ajustes de la tienda {tienda.id === "tienda-default" ? "" : ""}
          </p>
        </div>
      </header>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>Período contable</CardTitle>
          <CardDescription>
            El día en que se reinician los datos que se ven en el balance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DiaCorteForm diaCorteActual={diaCorte} />

          <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Con el corte actual, el período en curso es </span>
            <span className="font-medium">{ejemplo ?? "—"}</span>
            <span className="text-muted-foreground">.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
