"use client";

import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";

/**
 * Trigger de mobile + panel `Sheet` con la misma navegación del `<aside>` de
 * desktop. El contenido del panel es el `SidebarNav` compartido, así que la
 * búsqueda y las secciones colapsables se comportan igual en las dos
 * superficies.
 */
export function MobileSidebar({
  isAdmin,
  nombreTienda,
}: {
  isAdmin: boolean;
  nombreTienda: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar shadow-sm md:hidden">
      <div className="flex items-center justify-between px-3 py-1.5">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Abrir menú"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Menu />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 overflow-y-auto border-r border-sidebar-border bg-sidebar p-0 md:w-72"
          >
            <SheetHeader className="flex-row items-center gap-3 space-y-0 bg-linear-to-br from-sky-700 via-blue-800 to-indigo-900 px-4 py-3 text-white">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/20 font-bold backdrop-blur-sm">
                M
              </div>
              <SheetTitle className="flex flex-col leading-tight text-white">
                <span className="text-base font-bold">Mi Caja</span>
                <span className="max-w-[12rem] truncate text-xs font-normal text-sky-50/90">
                  {nombreTienda}
                </span>
              </SheetTitle>
            </SheetHeader>
            <SidebarNav
              isAdmin={isAdmin}
              onNavigate={() => setOpen(false)}
              className="px-3 py-3"
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}