"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Smartphone,
  ClipboardCheck,
  StickyNote,
  Truck,
  Users,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

type NavItem = { href: string; label: string };

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/": LayoutDashboard,
  "/gastos": Receipt,
  "/retiros": Wallet,
  "/nequi": Smartphone,
  "/cierre": ClipboardCheck,
  "/pedidos": StickyNote,
  "/proveedores": Truck,
  "/usuarios": Users,
};

const ICON_STYLE: Record<string, string> = {
  "/": "text-emerald-600 dark:text-emerald-400",
  "/gastos": "text-amber-600 dark:text-amber-400",
  "/retiros": "text-rose-600 dark:text-rose-400",
  "/nequi": "text-violet-600 dark:text-violet-400",
  "/cierre": "text-sky-600 dark:text-sky-400",
  "/pedidos": "text-pink-600 dark:text-pink-400",
  "/proveedores": "text-orange-600 dark:text-orange-400",
  "/usuarios": "text-teal-600 dark:text-teal-400",
};

/**
 * Sidebar hamburguesa para mobile. Se muestra solo en `md:` y abajo.
 * El sidebar desktop sigue siendo su ruta normal.
 */
export function MobileSidebar({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden sticky top-0 z-40 bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
            m
          </div>
          <span className="font-bold tracking-tight">minimarket</span>
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
            <Button variant="ghost" size="icon">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar">
            <SheetHeader className="p-5 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white">
              <SheetTitle className="text-white flex items-center gap-2">
                <div className="size-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold">
                  m
                </div>
                minimarket
              </SheetTitle>
            </SheetHeader>
            <nav className="p-3 space-y-1">
              {items.map((item) => {
                const Icon = ICONS[item.href];
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-sidebar-accent/60"
                    }
                  `}
                  >
                    {Icon ? (
                      <Icon
                        className={`size-4 ${ICON_STYLE[item.href] ?? "text-muted-foreground"}`}
                      />
                    ) : null}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}