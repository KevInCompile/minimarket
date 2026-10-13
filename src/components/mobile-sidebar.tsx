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
  "/": "text-sky-600 dark:text-sky-400",
  "/gastos": "text-amber-600 dark:text-amber-400",
  "/retiros": "text-rose-600 dark:text-rose-400",
  "/nequi": "text-violet-600 dark:text-violet-400",
  "/cierre": "text-sky-600 dark:text-sky-400",
  "/pedidos": "text-pink-600 dark:text-pink-400",
  "/proveedores": "text-orange-600 dark:text-orange-400",
  "/usuarios": "text-teal-600 dark:text-teal-400",
};

export function MobileSidebar({
  items,
  nombreTienda,
}: {
  items: NavItem[];
  nombreTienda: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden sticky top-0 z-40 bg-sidebar border-b border-sidebar-border shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Abrir menú"
            className="inline-flex items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground size-9 border border-sidebar-border shrink-0"
          >
            <Menu />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 md:w-72 p-0 bg-sidebar border-r border-sidebar-border"
          >
            <SheetHeader className="px-4 py-3 bg-linear-to-br from-sky-700 via-blue-800 to-indigo-900 text-white flex-row items-center gap-3 space-y-0">
              <div className="size-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold shrink-0">
                M
              </div>
              <SheetTitle className="text-white flex flex-col leading-tight">
                <span className="text-base font-bold">Mi Caja</span>
                <span className="text-xs font-normal text-sky-50/90 truncate max-w-[12rem]">
                  {nombreTienda}
                </span>
              </SheetTitle>
            </SheetHeader>
            <nav className="p-2 space-y-0.5">
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
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
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
