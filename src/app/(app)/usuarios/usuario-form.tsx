"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import {
  crearUsuarioAction,
  toggleUsuarioAction,
  type UsuarioState,
} from "@/server/actions/usuarios";
import { ConfirmDialog } from "@/components/confirm-dialog";

const INITIAL: UsuarioState = { ok: true, ts: 0 };

type UsuarioView = {
  id: string;
  nombre: string;
  email: string;
  role: "ADMIN" | "CAJERO";
  activo: boolean;
};

export function UsuarioForm() {
  const [state, action, pending] = useActionState(crearUsuarioAction, INITIAL);
  const lastTs = useRef(0);

  useEffect(() => {
    if (state.ts && state.ts !== lastTs.current) {
      lastTs.current = state.ts;
      if (state.error) toast.error(state.error);
      if (state.ok) toast.success("Usuario creado");
    }
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required placeholder="Nombre" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="email@…" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="role">Rol</Label>
          <Select name="role" defaultValue="CAJERO">
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
              <SelectItem value="CAJERO">CAJERO</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" />
        {pending ? "Creando…" : "Crear usuario"}
      </Button>
    </form>
  );
}

export function UsuarioList({
  usuarios,
  currentUserId,
}: {
  usuarios: UsuarioView[];
  currentUserId: string;
}) {
  if (usuarios.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Sin usuarios todavía.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usuarios.map((u) => (
          <UsuarioRow key={u.id} u={u} esActual={u.id === currentUserId} />
        ))}
      </TableBody>
    </Table>
  );
}

function UsuarioRow({ u, esActual }: { u: UsuarioView; esActual: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", u.id);
      await toggleUsuarioAction(fd);
      toast.success(u.activo ? `${u.nombre} desactivado` : `${u.nombre} activado`);
    });
  }

  return (
    <TableRow className={u.activo ? undefined : "opacity-60"}>
      <TableCell className="font-medium">{u.nombre}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
      <TableCell>
        <Badge
          variant={u.role === "ADMIN" ? "default" : "secondary"}
          className="font-normal"
        >
          {u.role}
        </Badge>
      </TableCell>
      <TableCell>
        {u.activo ? (
          <Badge variant="secondary" className="font-normal">activo</Badge>
        ) : (
          <Badge variant="outline" className="font-normal">inactivo</Badge>
        )}
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={esActual}
          title={esActual ? "No podés desactivarte a vos mismo" : undefined}
        >
          {u.activo ? "Desactivar" : "Activar"}
        </Button>
      </TableCell>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={u.activo ? `Desactivar ${u.nombre}` : `Activar ${u.nombre}`}
        description={
          u.activo
            ? "El usuario no podrá iniciar sesión hasta que lo actives de nuevo."
            : "El usuario podrá volver a iniciar sesión."
        }
        confirmLabel={u.activo ? "Desactivar" : "Activar"}
        variant="destructive"
        onConfirm={handleConfirm}
        pending={pending}
      />
    </TableRow>
  );
}
