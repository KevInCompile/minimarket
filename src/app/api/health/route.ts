import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Healthcheck que verifica la conexión a la DB y la config de Auth.
 * Útil para diagnosticar el error "There was a problem with the server configuration".
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; message: string }> = {};

  // 1. AUTH_SECRET presente y >= 32
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    checks.AUTH_SECRET = { ok: false, message: "AUTH_SECRET no está definido" };
  } else if (authSecret.length < 32) {
    checks.AUTH_SECRET = {
      ok: false,
      message: `AUTH_SECRET tiene ${authSecret.length} chars (mínimo 32). Generá uno nuevo con: openssl rand -base64 32`,
    };
  } else if (authSecret.startsWith("change-me")) {
    checks.AUTH_SECRET = {
      ok: false,
      message:
        "AUTH_SECRET es el placeholder del .env.example. Generá uno real con: openssl rand -base64 32",
    };
  } else {
    checks.AUTH_SECRET = {
      ok: true,
      message: `definido (${authSecret.length} chars)`,
    };
  }

  // 2. AUTH_TRUST_HOST
  const trustHost = process.env.AUTH_TRUST_HOST;
  checks.AUTH_TRUST_HOST = {
    ok: trustHost === "true",
    message: trustHost
      ? `AUTH_TRUST_HOST="${trustHost}"${trustHost === "true" ? "" : " (debería ser 'true' en producción)"}`
      : "AUTH_TRUST_HOST no está definido (debería ser 'true' en producción)",
  };

  // 3. DATABASE_URL definida
  const dbUrl = process.env.DATABASE_URL;
  checks.DATABASE_URL = {
    ok: !!dbUrl,
    message: dbUrl
      ? `definida (${dbUrl.replace(/:[^:@]+@/, ":***@")})`
      : "DATABASE_URL no está definido",
  };

  // 4. Conexión a la DB + tablas existen
  try {
    const [users, gastos, cierres, nequi, retiros, pedidos, proveedores] = await Promise.all([
      prisma.user.count(),
      prisma.gasto.count(),
      prisma.cierreDiario.count(),
      prisma.nequiDelDia.count(),
      prisma.retiro.count(),
      prisma.pedidoNota.count(),
      prisma.proveedor.count(),
    ]);
    checks.database = {
      ok: true,
      message: `conectado`,
    };
    (checks.database as Record<string, unknown>).counts = {
      users, gastos, cierres, nequi, retiros, pedidos, proveedores,
    };
  } catch (e) {
    checks.database = {
      ok: false,
      message: `error: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`,
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    { ok: allOk, checks, env: process.env.NODE_ENV },
    { status: allOk ? 200 : 503 },
  );
}