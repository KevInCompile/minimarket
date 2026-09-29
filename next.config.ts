import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Habilita forbidden() / unauthorized() helpers
    authInterrupts: true,
  },
};

export default nextConfig;
