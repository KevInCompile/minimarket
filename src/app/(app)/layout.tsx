import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Smartphone,
  ClipboardCheck,
  StickyNote,
  Truck,
  Users,
  LogOut,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Balance", icon: LayoutDashboard },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/retiros", label: "Retiros", icon: Wallet, adminOnly: true },
  { href: "/nequi", label: "Nequi", icon: Smartphone },
  { href: "/cierre", label: "Cierre diario", icon: ClipboardCheck },
  { href: "/pedidos", label: "Pedidos (nota)", icon: StickyNote, adminOnly: true },
  { href: "/proveedores", label: "Proveedores", icon: Truck, adminOnly: true },
  { href: "/usuarios", label: "Usuarios", icon: Users, adminOnly: true },
];

const ROLE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  ADMIN: {
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-800 dark:text-amber-300",
    label: "Admin",
  },
  CAJERO: {
    bg: "bg-sky-100 dark:bg-sky-950/40",
    text: "text-sky-800 dark:text-sky-300",
    label: "Cajero",
  },
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

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";
  const roleStyle = ROLE_STYLE[session.user.role] ?? ROLE_STYLE.CAJERO;

  const items = NAV.filter((i) => isAdmin || !i.adminOnly);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-background flex flex-col">
        <div className="p-5  text-white">
          <Link href="/" className="block">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-lg">
                m
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight">minimarket</div>
                <div className="text-xs text-emerald-50/90">control de caja</div>
              </div>
            </div>
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 p-3 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <item.icon
                className={`size-4 ${ICON_STYLE[item.href] ?? "text-muted-foreground"} group-hover:scale-110 transition-transform`}
              />
              {item.label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="size-8 rounded-full bg-background flex items-center justify-center text-white font-semibold text-sm">
              {session.user.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{session.user.name}</div>
              <span
                className={`inline-block text-xs px-1.5 py-0.5 rounded ${roleStyle.bg} ${roleStyle.text} font-medium`}
              >
                {roleStyle.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={logoutAction} className="flex-1">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="w-full justify-start hover:text-rose-600 dark:hover:text-rose-400"
              >
                <LogOut className="size-4" />
                Salir
              </Button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
