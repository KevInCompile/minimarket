"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { type ActionState } from "./_state";

export type LoginState = ActionState;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
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
        return { ok: false, error: "Email o contraseña incorrectos.", ts: Date.now() };
      }
      return { ok: false, error: "No se pudo iniciar sesión. Intentá de nuevo.", ts: Date.now() };
    }
    // signIn redirige con NEXT_REDIRECT cuando es exitoso — hay que relanzar.
    throw e;
  }
  return { ok: true, ts: Date.now() };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
  redirect("/login");
}
