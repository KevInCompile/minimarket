"use client";

import { useActionState } from "react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthError } from "next-auth";
import { okState, errState, type ActionState } from "@/server/actions/_state";

const initial: ActionState = { ok: true, ts: 0 };

export function LoginForm({ from }: { from: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const lastTs = useRef(0);

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) toast.error(state.error);
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Ingresá tu email y contraseña.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <input type="hidden" name="from" value={from} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="vos@minimarket.local"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="mt-4">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = formData.get("email")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const from = formData.get("from")?.toString() || "/";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: from,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.type === "CredentialsSignin") {
        return errState("Email o contraseña incorrectos.");
      }
      return errState("No se pudo iniciar sesión. Intentá de nuevo.");
    }
    // signIn redirige con NEXT_REDIRECT cuando es exitoso: hay que re-lanzar.
    throw e;
  }
  return okState();
}
