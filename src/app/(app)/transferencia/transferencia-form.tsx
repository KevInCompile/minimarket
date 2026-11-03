"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toISODateLocal } from "@/lib/dates";
import {
  guardarTransferenciaAction,
  type TransferenciaState,
} from "@/server/actions/transferencia";

const INITIAL: TransferenciaState = { ok: true, ts: 0 };

/**
 * Formulario de Transferencia con fecha explícita.
 *
 * Es el control para registrar la transferencia de UN día cualquiera, incluso
 * de un mes anterior al que se está viendo. La tabla inline sigue existiendo
 * para llenar un mes entero de un tirón: este formulario es el Complemento
 * para días fuera del rango visible.
 *
 * Reusa `guardarTransferenciaAction` (la misma server action de la tabla
 * inline), así que las dos rutas escriben exactamente igual.
 */
export function TransferenciaForm({
  fechaInicial,
  onClose,
  onSuccess,
}: {
  /**
   * Fecha por defecto ('YYYY-MM-DD'). La page la calcula con el período que
   * el usuario está viendo (`fechaPorDefectoPara`): si está viendo octubre,
   * el formulario se abre con el 2026-10-31.
   */
  fechaInicial?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState(
    guardarTransferenciaAction,
    INITIAL,
  );
  const lastTs = useRef(0);
  // La página monta este formulario dos veces (panel de escritorio y hoja
  // inferior de mobile). Sin prefijo, los ids se repetirían y el `label`
  // apuntaría al input del otro formulario.
  const uid = useId();

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) {
        toast.error(state.error);
      } else if (state.ok) {
        toast.success("Transferencia registrada");
        onSuccess?.();
        onClose?.();
      }
    }
  }, [state, onSuccess, onClose]);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
        <div className="space-y-1">
          <Label htmlFor={`${uid}-fecha`}>Fecha</Label>
          <p className="text-xs text-muted-foreground">
            Registre la transferencia de cualquier día, incluso de un mes
            anterior al que está viendo.
          </p>
        </div>
        <Input
          id={`${uid}-fecha`}
          name="fecha"
          type="date"
          defaultValue={fechaInicial ?? toISODateLocal(new Date())}
          max={toISODateLocal(new Date())}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${uid}-total`}>Total recibido (COP)</Label>
        <Input
          id={`${uid}-total`}
          name="total"
          type="text"
          inputMode="numeric"
          placeholder="50000"
          required
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        <Plus className="size-4" />
        {pending ? "Guardando…" : "Registrar transferencia"}
      </Button>
    </form>
  );
}

/**
 * Botón "Registrar transferencia" del toolbar (desktop).
 *
 * Abre un panel lateral con el formulario. El estado del panel vive acá
 * porque el formulario tiene que cerrarlo cuando el guardado termina bien.
 */
export function TransferenciaRegistroToolbar({
  fechaInicial,
}: {
  fechaInicial?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="hidden md:inline-flex h-9 px-4 py-2 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="size-4" />
        Registrar transferencia
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Registrar transferencia</SheetTitle>
          <SheetDescription>
            Registre la transferencia recibida en el día que necesite.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <TransferenciaForm
            fechaInicial={fechaInicial}
            onClose={() => setOpen(false)}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Botón flotante (FAB) de mobile: un solo toque abre la hoja inferior con el
 * mismo formulario.
 */
export function TransferenciaRegistroFab({
  fechaInicial,
}: {
  fechaInicial?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="md:hidden fixed bottom-6 right-6 z-30 size-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center"
        aria-label="Registrar transferencia"
      >
        <Plus className="size-6" />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="w-full max-h-[90vh] p-0 gap-0 rounded-t-2xl"
      >
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Registrar transferencia</SheetTitle>
          <SheetDescription>
            Registre la transferencia recibida en el día que necesite.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <TransferenciaForm
            fechaInicial={fechaInicial}
            onClose={() => setOpen(false)}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
