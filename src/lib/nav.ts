/**
 * Navegacion de la aplicacion, agrupada en secciones.
 *
 * Fuente unica de verdad para las dos barras: la lateral de desktop
 * (`src/app/(app)/layout.tsx`) y la de mobile
 * (`src/components/mobile-sidebar.tsx`). Ambas consumen `NAV_SECTIONS` a
 * traves del componente compartido `SidebarNav`, asi que agregar una ruta o
 * moverla de seccion se hace en un solo lugar. La barra superior tambien
 * deriva de acá el titulo de la ruta activa (`PageIdentity`).
 *
 * `keywords` alimenta la busqueda del sidebar: son sinonimos en minusculas
 * (sin tildes) que amplian el matching por `label`.
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
  /**
   * Sinónimos en minúsculas para la búsqueda del sidebar (`keywords`), así
   * que "compras" encuentra "/gastos". La comparación normaliza acentos, por
   * eso van sin tildes.
   */
  keywords?: string[];
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
        keywords: ["balance", "resumen", "inicio", "dashboard", "total", "home"],
      },
      {
        href: "/cierre",
        label: "Cierre diario",
        icon: ClipboardCheck,
        iconClass: "text-sky-600 dark:text-sky-400",
        keywords: ["cierre", "diario", "dia", "corte", "cuadre", "descuadre", "arqueo"],
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
        keywords: ["transferencia", "transferencias", "nequi", "envio", "recibido"],
      },
      {
        href: "/gastos",
        label: "Gastos",
        icon: Receipt,
        iconClass: "text-amber-600 dark:text-amber-400",
        keywords: ["gasto", "gastos", "compras", "egreso", "salida", "pago", "pagos"],
      },
      {
        href: "/retiros",
        label: "Retiros",
        icon: Wallet,
        iconClass: "text-rose-600 dark:text-rose-400",
        adminOnly: true,
        keywords: ["retiro", "retiros", "retirar", "retirada", "caja"],
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
        keywords: ["pedido", "pedidos", "nota", "notas", "encargo", "orden", "ordenes"],
      },
      {
        href: "/proveedores",
        label: "Proveedores",
        icon: Truck,
        iconClass: "text-orange-600 dark:text-orange-400",
        adminOnly: true,
        keywords: ["proveedor", "proveedores", "suministro", "suministros", "acreedor"],
      },
      {
        href: "/usuarios",
        label: "Usuarios",
        icon: Users,
        iconClass: "text-teal-600 dark:text-teal-400",
        adminOnly: true,
        keywords: ["usuario", "usuarios", "personal", "cajero", "empleado", "roles"],
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