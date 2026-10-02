import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Habilita forbidden() / unauthorized() helpers
    authInterrupts: true,
  },
  // Prisma y bcryptjs son dependencias solo de servidor: no las bundlees
  // en el cliente. Evita errores de build tipo "Can't resolve '.prisma/client'"
  // con Turbopack en serverless.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;