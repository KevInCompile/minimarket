import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { NAV_SECTIONS, type NavItem } from "@/lib/nav";
import { LogOut } from "lucide-react";

type NavSection = { title: string; items: NavItem[] };

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

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";
  const roleStyle = ROLE_STYLE[session.user.role] ?? ROLE_STYLE.CAJERO;

  // Traer el nombre de la tienda del user
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tienda: { select: { nombre: true } } },
  });
  const nombreTienda = user?.tienda?.nombre ?? "";

  const sections: NavSection[] = NAV_SECTIONS.map((s) => ({
    title: s.title,
    items: s.items.filter((i) => isAdmin || !i.adminOnly),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <MobileSidebar isAdmin={isAdmin} nombreTienda={nombreTienda} />

      <aside className="hidden md:flex w-60 shrink-0 border-r border-sidebar-border bg-background flex-col">
        <div className="p-5 text-white bg-linear-to-br from-sky-700 via-blue-800 to-indigo-900">
          <Link href="/" className="block">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-lg">
                M
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl font-bold tracking-tight truncate">Mi Caja</div>
                <div className="text-xs text-sky-50/90 truncate">
                  {nombreTienda}
                </div>
              </div>
            </div>
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 p-3 overflow-y-auto">
          {sections.map((section, i) => (
            <div key={section.title} className={i > 0 ? "mt-5" : ""}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  >
                    <item.icon
                      className={`size-4 ${item.iconClass ?? "text-muted-foreground"} group-hover:scale-110 transition-transform`}
                    />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
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
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
