"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Patrón para crear registros desde un listado.
 * - Mobile: un FAB que abre un Sheet full-screen con el form
 * - Desktop: el FormSheet actúa como un Drawer derecho con el form embebido
 *
 * El caller provee el contenido del form como `form` (un <form action={...}>).
 * El formSheet NO maneja el submit — lo hace el server action del caller.
 * El formSheet solo se ocupa del modal/drawer.
 */
type Props = {
  /** Título del Sheet (ej: "Nuevo gasto") */
  title: string;
  /** Descripción opcional bajo el título */
  description?: string;
  /** Texto del FAB en mobile (default: "Nuevo") */
  fabLabel?: string;
  /** Form completo (un <form> con sus campos) */
  form: ReactNode;
  /** Cuando se abre el sheet (opcional) */
  onOpen?: () => void;
  /** Cuando se cierra el sheet (después de submit exitoso, etc.) */
  onClose?: () => void;
  /** Si se provee, el Sheet se cierra automáticamente cuando cambia este valor */
  closeOn?: unknown;
};

export function FormSheet({
  title,
  description,
  fabLabel = "Nuevo",
  form,
  onOpen,
  onClose,
  closeOn,
}: Props) {
  const [open, setOpen] = useState(false);
  const [prevCloseOn, setPrevCloseOn] = useState(closeOn);
  // El onClose se actualiza en el effect — la ref se inicializa una vez.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (
      closeOn !== undefined &&
      closeOn !== prevCloseOn &&
      open
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    setPrevCloseOn(closeOn);
  }, [closeOn, prevCloseOn, open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && onOpen) onOpen();
    if (!next && onCloseRef.current) onCloseRef.current();
  }

  return (
    <>
      {/* FAB: solo en mobile, hidden en md+ */}
      <div className="md:hidden fixed bottom-6 right-6 z-30">
        <Button
          type="button"
          onClick={() => setOpen(true)}
          size="icon"
          className="size-14 rounded-full shadow-lg bg-sky-600 hover:bg-sky-700 text-white"
          aria-label={fabLabel}
        >
          <Plus className="size-6" />
        </Button>
      </div>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger>
          {/* Trigger invisible para desktop, permite abrir el sheet programáticamente */}
          <button
            type="button"
            className="hidden md:inline-flex"
            aria-label="Abrir formulario"
          />
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 gap-0"
        >
          <SheetHeader className="px-6 py-4 border-b bg-sky-50/50 dark:bg-sky-950/20">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* El caller provee el <form> completo con sus inputs y server action */}
            {form}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * Botón para abrir el form en desktop (visible solo en md+).
 * El caller lo pone en la columna derecha del layout de 2 columnas.
 */
export function FormSheetTrigger({
  label = "Nuevo",
  onClick,
  className,
}: {
  label?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={className}
    >
      <Plus className="size-4" />
      {label}
    </Button>
  );
}
