"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NAV_SECTIONS, navItemsFor, type NavItem, type NavSection } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Navegacion lateral compartida por el `<aside>` de desktop y por el `Sheet`
 * de mobile. Al vivir en un solo lugar, la busqueda y las secciones
 * colapsables se comportan igual en las dos superficies.
 *
 * - El buscador filtra por `label` o por cualquier `keywords` del item,
 *   comparando texto normalizado (sin acentos, en minusculas).
 * - Con consulta activa los resultados se muestran planos e ignoran el estado
 *   de colapso; sin consulta se ven las secciones, colapsables con el
 *   chevron de la derecha. Todas arrancan abiertas.
 */
export function SidebarNav({
  isAdmin,
  onNavigate,
  className,
}: {
  /** Muestra los items `adminOnly` (el proxy igual bloquea la URL directa). */
  isAdmin: boolean;
  /** Se dispara al navegar, para cerrar el `Sheet` de mobile. */
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Secciones visibles para el rol, sin las que quedan vacias.
  const secciones = useMemo<NavSection[]>(
    () =>
      NAV_SECTIONS.map((s) => ({
        title: s.title,
        items: s.items.filter((i) => isAdmin || !i.adminOnly),
      })).filter((s) => s.items.length > 0),
    [isAdmin],
  );

  const q = normaliza(search.trim());
  const buscando = q.length > 0;
  const resultados = useMemo(
    () =>
      buscando
        ? secciones.flatMap((s) => s.items).filter((i) => coincide(i, q))
        : [],
    [buscando, q, secciones],
  );

  // ⌘K / Ctrl+K (también ⌘/) enfoca el buscador. Hay dos instancias montadas
  // (desktop y mobile): solo la visible puede recibir foco, por eso el
  // `offsetParent`.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key !== "k" && e.key !== "/") return;
      const el = inputRef.current;
      if (!el || el.offsetParent === null || el === document.activeElement) return;
      e.preventDefault();
      el.focus();
      el.select();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function toggleSeccion(title: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  return (
    <nav className={cn("flex flex-col gap-3", className)} aria-label="Menú principal">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar…"
          aria-label="Buscar en el menú"
          className="h-9 bg-background pl-7 pr-12 dark:bg-input/30"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
          ⌘K
        </kbd>
      </div>

      {buscando ? (
        resultados.length > 0 ? (
          <div className="space-y-0.5">
            {resultados.map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Sin resultados para “{search.trim()}”.
          </p>
        )
      ) : (
        secciones.map((section) => {
          const isCollapsed = collapsed.has(section.title);
          return (
            <div key={section.title}>
              <div className="flex items-center justify-between gap-1 px-3 pb-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </p>
                <button
                  type="button"
                  onClick={() => toggleSeccion(section.title)}
                  aria-expanded={!isCollapsed}
                  aria-label={`${isCollapsed ? "Expandir" : "Contraer"} ${section.title}`}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                </button>
              </div>
              {isCollapsed ? null : (
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <SidebarNavLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </nav>
  );
}

/**
 * Identidad de la ruta activa para la barra superior: icono + label tomados
 * de `NAV_SECTIONS`, así que sigue a la navegación sin duplicar el catálogo.
 * Las páginas que no están en el menú (ej. `/importar`) caen al último
 * segmento de la URL.
 */
export function PageIdentity({ className }: { className?: string }) {
  const pathname = usePathname();
  const item = navItemsFor(NAV_SECTIONS, true).find((i) =>
    esRutaActiva(pathname, i.href),
  );
  const Icon = item?.icon ?? LayoutDashboard;
  const label =
    item?.label ??
    (pathname.split("/").filter(Boolean).pop() ?? "Balance");

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <Icon
        className={cn("size-4 shrink-0", item?.iconClass ?? "text-muted-foreground")}
      />
      <span className="truncate text-sm font-semibold tracking-tight">{label}</span>
    </div>
  );
}

/** Regla de ruta activa, compartida por el nav y la barra superior. */
export function esRutaActiva(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

/**
 * Normaliza texto para comparar: minúsculas y sin diacríticos, para que
 * "retiros" encuentre "Retiros" y "operacion" encuentre "Operación".
 */
function normaliza(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** ¿El item matchea la consulta por `label` o por algún `keywords`? */
function coincide(item: NavItem, q: string): boolean {
  if (normaliza(item.label).includes(q)) return true;
  return (item.keywords ?? []).some((k) => normaliza(k).includes(q));
}

function SidebarNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = esRutaActiva(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <item.icon
        className={cn(
          "size-4 shrink-0 transition-transform group-hover:scale-110",
          item.iconClass ?? "text-muted-foreground",
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}