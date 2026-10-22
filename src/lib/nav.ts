/**
 * Navegacion de la aplicacion, agrupada en secciones.
 *
 * Fuente unica de verdad para las dos barras: la lateral de desktop
 * (`src/app/(app)/layout.tsx`) y la de mobile
 * (`src/components/mobile-sidebar.tsx`). Ambas consumen `NAV_SECTIONS`,
 * asi que agregar una ruta o moverla de seccion se hace en un solo lugar.
 */
import {
  LayoutDashboard,
  ClipboardCheck,
  Smartphone,
  Receipt,
  Wallet,
  StickyNote,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Visible solo para ADMIN. El proxy ya bloquea el acceso por URL. */
  adminOnly?: boolean;
  /** Clase de Tailwind para el color del icono. */
  iconClass?: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Operacion",
    items: [
      {
        href: "/",
        label: "Balance",
        icon: LayoutDashboard,
        iconClass: "text-sky-600 dark:text-sky-400",
      },
      {
        href: "/cierre",
        label: "Cierre diario",
        icon: ClipboardCheck,
        iconClass: "text-sky-600 dark:text-sky-400",
      },
    ],
  },
  {
    title: "Dinero",
    items: [
      {
        href: "/transferencia",
        label: "Transferencia",
        icon: Smartphone,
        iconClass: "text-violet-600 dark:text-violet-400",
      },
      {
        href: "/gastos",
        label: "Gastos",
        icon: Receipt,
        iconClass: "text-amber-600 dark:text-amber-400",
      },
      {
        href: "/retiros",
        label: "Retiros",
        icon: Wallet,
        iconClass: "text-rose-600 dark:text-rose-400",
        adminOnly: true,
      },
    ],
  },
  {
    title: "Administracion",
    items: [
      {
        href: "/pedidos",
        label: "Pedidos (nota)",
        icon: StickyNote,
        iconClass: "text-pink-600 dark:text-pink-400",
        adminOnly: true,
      },
      {
        href: "/proveedores",
        label: "Proveedores",
        icon: Truck,
        iconClass: "text-orange-600 dark:text-orange-400",
        adminOnly: true,
      },
      {
        href: "/usuarios",
        label: "Usuarios",
        icon: Users,
        iconClass: "text-teal-600 dark:text-teal-400",
        adminOnly: true,
      },
    ],
  },
];

/**
 * Aplana las secciones a una lista de items, opcionalmente filtrando los
 * reservados a ADMIN.
 */
export function navItemsFor(
  sections: NavSection[],
  isAdmin: boolean,
): NavItem[] {
  return sections.flatMap((s) =>
    s.items.filter((i) => isAdmin || !i.adminOnly),
  );
}