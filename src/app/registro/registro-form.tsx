"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Store, User } from "lucide-react";
import { registroAction, type RegistroState } from "@/server/actions/registro";

const INITIAL: RegistroState = { ok: true, ts: 0 };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function RegistroForm() {
  const [state, action, pending] = useActionState(registroAction, INITIAL);
  const [nombreTienda, setNombreTienda] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);

  function onNombreChange(v: string) {
    setNombreTienda(v);
    if (!slugDirty) setSlug(slugify(v));
  }

  function onSlugChange(v: string) {
    setSlug(v.toLowerCase());
    setSlugDirty(true);
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="nombre">
            <User className="inline size-3.5 mr-1" />
            Su nombre
          </Label>
          <Input
            id="nombre"
            name="nombre"
            required
            placeholder="María Pérez"
            disabled={pending || pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="maria@ejemplo.com"
            disabled={pending || pending}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          disabled={pending || pending}
        />
      </div>

      <div className="rounded-md border border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 p-3 space-y-3">
        <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 text-sm font-medium">
          <Store className="size-4" />
          Datos de la tienda
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nombreTienda">Nombre de la tienda</Label>
          <Input
            id="nombreTienda"
            name="nombreTienda"
            required
            placeholder="Mi Tienda S.A."
            value={nombreTienda}
            onChange={(e) => onNombreChange(e.target.value)}
            disabled={pending || pending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">Identificador (URL)</Label>
          <Input
            id="slug"
            name="slug"
            required
            placeholder="mi-tienda"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            disabled={pending || pending}
          />
          <p className="text-xs text-muted-foreground">
            Solo letras minúsculas, números y guiones. Único en el sistema.
          </p>
        </div>
      </div>

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2">
          <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{state.error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={pending || pending}
        className="w-full"
      >
        {pending || pending ? "Creando cuenta..." : "Crear cuenta y tienda"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tiene cuenta?{" "}
        <Link href="/login" className="text-sky-700 dark:text-sky-300 font-medium hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
