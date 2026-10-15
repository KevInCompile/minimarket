"use client";

import { useState } from "react";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UsuarioForm, UsuarioList } from "./usuario-form";
import type { UsuarioState } from "@/server/actions/usuarios";

type UsuarioView = {
  id: string;
  nombre: string;
  email: string;
  role: "ADMIN" | "CAJERO";
  activo: boolean;
};

const INITIAL: UsuarioState = { ok: true, ts: 0 };

export function UsuariosView({
  usuarios,
  currentUserId,
}: {
  usuarios: UsuarioView[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="size-7 text-teal-600 dark:text-teal-400" />
            Usuarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {usuarios.length} usuarios · {usuarios.filter((u) => u.activo).length} activos
          </p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="hidden md:inline-flex h-9 px-4 py-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" />
            Nuevo usuario
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl p-0 gap-0"
          >
            <SheetHeader className="px-6 py-4 border-b bg-teal-50/50 dark:bg-teal-950/20">
              <SheetTitle>Nuevo usuario</SheetTitle>
              <SheetDescription>
                Cree un usuario con rol ADMIN o CAJERO.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <UsuarioForm
                onClose={() => setOpen(false)}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <UsuarioList
        usuarios={usuarios}
        currentUserId={currentUserId}
      />

      <div className="md:hidden fixed bottom-6 right-6 z-30">
        <Button
          type="button"
          onClick={() => setOpen(true)}
          size="icon"
          className="size-14 rounded-full shadow-lg bg-teal-600 hover:bg-teal-700 text-white"
          aria-label="Nuevo usuario"
        >
          <Plus className="size-6" />
        </Button>
      </div>
    </div>
  );
}
