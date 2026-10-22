import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { PageIdentity, SidebarNav } from "@/components/sidebar-nav";
import { LogOut, MoreHorizontal } from "lucide-react";

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

/**
 * Shell de la app autenticada: lateral fijo de desktop + columna principal
 * (barra superior y contenido). El padding de página vive en cada `page.tsx`
 * (`p-4 md:p-10`), acá no se agrega ninguno.
 */
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

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:sticky md:top-0 md:flex md:h-screen md:self-start">
        <div className="p-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-sky-600 to-blue-700 text-base font-bold text-white">
              M
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight">
                Mi Caja
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {nombreTienda}
              </div>
            </div>
          </Link>
        </div>
        <Separator />
        <SidebarNav isAdmin={isAdmin} className="flex-1 overflow-y-auto px-3 py-3" />

        <Separator />
        <div className="space-y-2 p-3">
          {/* Sesión: avatar, nombre, email, rol y logout */}
          <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-600 to-blue-700 text-sm font-semibold text-white">
                {session.user.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">
                  {session.user.name}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {session.user.email}
                </div>
              </div>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${roleStyle.bg} ${roleStyle.text}`}
              >
                {roleStyle.label}
              </span>
            </div>
            <form action={logoutAction} className="mt-2">
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
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileSidebar isAdmin={isAdmin} nombreTienda={nombreTienda} />

        {/* Barra superior: identidad de la ruta a la izquierda, slot de
            acciones de página a la derecha (Export/Share llegan después). */}
        <div className="z-30 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-2 backdrop-blur md:sticky md:top-0 md:px-10">
          <PageIdentity />
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Más opciones"
              aria-label="Más opciones"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        </div>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}