"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { NAV_SECTIONS, navItemsFor, type NavItem } from "@/lib/nav";

export function MobileSidebar({
  isAdmin,
  nombreTienda,
}: {
  isAdmin: boolean;
  nombreTienda: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const sections = NAV_SECTIONS.map((s) => ({
    title: s.title,
    items: s.items.filter((i) => isAdmin || !i.adminOnly),
  })).filter((s) => s.items.length > 0);

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
            className="w-72 md:w-72 p-0 bg-sidebar border-r border-sidebar-border overflow-y-auto"
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
            <nav className="p-3">
              {sections.map((section, i) => (
                <div key={section.title} className={i > 0 ? "mt-5" : ""}>
                  <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        onNavigate={() => setOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active =
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href));
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "hover:bg-sidebar-accent/60"
      }`}
    >
      <item.icon
        className={`size-4 ${item.iconClass ?? "text-muted-foreground"}`}
      />
      {item.label}
    </Link>
  );
}
