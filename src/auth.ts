import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";

type AppRole = "ADMIN" | "CAJERO";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      tiendaId: string;
    } & DefaultSession["user"];
  }
  interface User {
    role: AppRole;
    tiendaId: string;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user || !user.activo) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          role: user.role,
          tiendaId: user.tiendaId,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = user.role;
        token.tiendaId = (user as { tiendaId?: string }).tiendaId;
      }
      return token;
    },
    async session({ session, token }) {
      const uid = token.uid as string | undefined;
      const role = token.role as AppRole | undefined;
      const tiendaId = token.tiendaId as string | undefined;
      if (uid) session.user.id = uid;
      if (role) session.user.role = role;
      if (tiendaId) session.user.tiendaId = tiendaId;
      return session;
    },
  },
});
