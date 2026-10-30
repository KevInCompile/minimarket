"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
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
import { toISODateLocal } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import { crearGastoAction, type GastoState } from "@/server/actions/gastos";

const INITIAL: GastoState = { ok: true, ts: 0 };

type Proveedor = { id: string; nombre: string };

/**
 * Una fila del formulario: un gasto con su proveedor y su valor.
 *
 * El `id` es estable y no es el índice: al quitar una fila del medio los
 * índices se mueven, pero cada fila conserva su identidad (y su valor de
 * "pagado con").
 */
type Fila = {
  id: number;
  proveedor: string;
  valor: string;
};

/**
 * Convierte el texto de un valor a número con la misma regla que usa el
 * servidor: solo dígitos. Devuelve 0 (nunca NaN) para lo que no sea un
 * número, así el total que ve el usuario no puede mostrar "NaN".
 */
function valorANumero(texto: string): number {
  const digitos = texto.replace(/[^0-9]/g, "");
  if (!digitos) return 0;
  const n = Number(digitos);
  return Number.isFinite(n) ? n : 0;
}

function nuevaFila(id: number): Fila {
  return { id, proveedor: "", valor: "" };
}

/**
 * Formulario de gasto. Solo el formulario — sin FAB, sin modal, sin sheet.
 *
 * El contenedor (GastosView) decide cómo se muestra: dentro de un Sheet en
 * desktop, dentro de un modal bottom-sheet en mobile (controlado por el FAB).
 *
 * Registra VARIOS gastos del mismo día: una sola fecha compartida arriba y
 * una fila por gasto (proveedor, valor, pagado con, nota). Todos se envían
 * juntos en un solo submit.
 *
 * Este componente solo gestiona el estado del submit y notifica el éxito/error.
 */
export function GastoForm({
  proveedores,
  onClose,
  onSuccess,
}: {
  proveedores: Proveedor[];
  onClose?: () => void;
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState(crearGastoAction, INITIAL);
  const [filas, setFilas] = useState<Fila[]>([nuevaFila(0)]);
  // Sube al resetear el formulario: al cambiar, las filas se vuelven a montar
  // y así los inputs que no son controlados (nota, select) quedan limpios.
  const [epoch, setEpoch] = useState(0);

  const lastOkRef = useRef(false);
  const siguienteIdRef = useRef(1);
  // Cuántas filas se enviaron en el último submit (para el mensaje del toast).
  const conteoEnvioRef = useRef(0);
  const filasRef = useRef(filas);
  // Inputs de proveedor por fila, para enfocar el de la fila nueva.
  const inputsProveedor = useRef(new Map<number, HTMLInputElement | null>());
  const idEnFocoRef = useRef<number | null>(null);
  // Prefijo de los ids del DOM. La página monta este formulario dos veces (el
  // panel de escritorio y la hoja inferior de mobile) y, sin prefijo, los ids
  // se repetirían: el `label` apuntaría al input del otro formulario.
  const uid = useId();

  useEffect(() => {
    filasRef.current = filas;
  }, [filas]);

  // Enfoca el proveedor de la fila que se acaba de agregar.
  useEffect(() => {
    const id = idEnFocoRef.current;
    if (id === null) return;
    idEnFocoRef.current = null;
    inputsProveedor.current.get(id)?.focus();
  }, [filas]);

  useEffect(() => {
    if (state.ts && state.ts !== INITIAL.ts) {
      if (state.error) {
        toast.error(state.error);
      } else if (state.ok && !lastOkRef.current) {
        const cantidad = conteoEnvioRef.current || filasRef.current.length;
        toast.success(
          cantidad === 1 ? "Gasto registrado" : `${cantidad} gastos registrados`,
        );
        // El formulario vuelve a una sola fila vacía.
        setFilas([nuevaFila(0)]);
        siguienteIdRef.current = 1;
        setEpoch((e) => e + 1);
        onSuccess?.();
        onClose?.();
      }
      lastOkRef.current = state.ok;
    }
  }, [state, onSuccess, onClose]);

  const agregarFila = useCallback(() => {
    const id = siguienteIdRef.current++;
    setFilas((previas) => [...previas, nuevaFila(id)]);
    idEnFocoRef.current = id;
  }, []);

  const quitarFila = useCallback((id: number) => {
    setFilas((previas) =>
      previas.length <= 1 ? previas : previas.filter((f) => f.id !== id),
    );
  }, []);

  const cambiarFila = useCallback((id: number, cambios: Partial<Fila>) => {
    setFilas((previas) =>
      previas.map((f) => (f.id === id ? { ...f, ...cambios } : f)),
    );
  }, []);

  const registrarProveedor = useCallback(
    (id: number, el: HTMLInputElement | null) => {
      if (el) inputsProveedor.current.set(id, el);
      else inputsProveedor.current.delete(id);
    },
    [],
  );

  const total = filas.reduce((suma, f) => suma + valorANumero(f.valor), 0);

  return (
    <form
      action={action}
      onSubmit={() => {
        conteoEnvioRef.current = filasRef.current.length;
      }}
      className="space-y-5"
    >
      {/* Fecha compartida por todas las filas */}
      <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
        <div className="space-y-1">
          <Label htmlFor={`${uid}-fecha`}>Fecha</Label>
          <p className="text-xs text-muted-foreground">
            Esta fecha se aplica a todos los gastos que agregue debajo.
          </p>
        </div>
        <Input
          key={`fecha-${epoch}`}
          id={`${uid}-fecha`}
          name="fecha"
          type="date"
          defaultValue={toISODateLocal(new Date())}
          required
        />
      </div>

      {/* Cuántas filas trae el formulario (lo lee la server action) */}
      <input type="hidden" name="filas" value={filas.length} />

      <div className="space-y-3">
        {filas.map((fila, i) => (
          <FilaGasto
            key={`${epoch}-${fila.id}`}
            uid={uid}
            indice={i}
            fila={fila}
            puedeQuitar={filas.length > 1}
            onCambio={cambiarFila}
            onQuitar={quitarFila}
            onRegistrarProveedor={registrarProveedor}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={agregarFila}>
          <Plus className="size-4" />
          Agregar otro
        </Button>
        <p className="text-sm text-muted-foreground">
          Total:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatCOP(total)}
          </span>
        </p>
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        <Plus className="size-4" />
        {pending
          ? "Guardando…"
          : filas.length === 1
            ? "Registrar gasto"
            : `Registrar ${filas.length} gastos`}
      </Button>

      <datalist id={`${uid}-proveedores-list`}>
        {proveedores.map((p) => (
          <option key={p.id} value={p.nombre} />
        ))}
      </datalist>
    </form>
  );
}

/**
 * Una fila del formulario (un gasto).
 *
 * Los `name` van indexados (`proveedor_0`, `valor_0`, ...) porque todas las
 * filas comparten la misma fecha y el servidor las lee una por una. El select
 * de "pagado con" también necesita nombre propio: Base UI genera su input
 * oculto con el `name` que se le pasa.
 */
function FilaGasto({
  uid,
  indice,
  fila,
  puedeQuitar,
  onCambio,
  onQuitar,
  onRegistrarProveedor,
}: {
  uid: string;
  indice: number;
  fila: Fila;
  puedeQuitar: boolean;
  onCambio: (id: number, cambios: Partial<Fila>) => void;
  onQuitar: (id: number) => void;
  onRegistrarProveedor: (id: number, el: HTMLInputElement | null) => void;
}) {
  const refProveedor = useCallback(
    (el: HTMLInputElement | null) => onRegistrarProveedor(fila.id, el),
    [fila.id, onRegistrarProveedor],
  );

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Gasto {indice + 1}
        </span>
        {puedeQuitar && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Quitar el gasto ${indice + 1}`}
            onClick={() => onQuitar(fila.id)}
          >
            <Trash2 />
            Quitar
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${uid}-proveedor_${indice}`}>Proveedor</Label>
        <Input
          ref={refProveedor}
          id={`${uid}-proveedor_${indice}`}
          name={`proveedor_${indice}`}
          list={`${uid}-proveedores-list`}
          placeholder="Escriba o elija un proveedor"
          value={fila.proveedor}
          onChange={(e) => onCambio(fila.id, { proveedor: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${uid}-valor_${indice}`}>Valor (COP)</Label>
          <Input
            id={`${uid}-valor_${indice}`}
            name={`valor_${indice}`}
            type="text"
            inputMode="numeric"
            placeholder="50000"
            value={fila.valor}
            onChange={(e) => onCambio(fila.id, { valor: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-pagadoCon_${indice}`}>Pagado con</Label>
          <Select name={`pagadoCon_${indice}`} defaultValue="CAJA">
            <SelectTrigger id={`${uid}-pagadoCon_${indice}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CAJA">Caja (del día)</SelectItem>
              <SelectItem value="EFECTIVO">Efectivo (del guardado)</SelectItem>
              <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${uid}-nota_${indice}`}>Nota (opcional)</Label>
        <Input
          id={`${uid}-nota_${indice}`}
          name={`nota_${indice}`}
          placeholder="…"
        />
      </div>
    </div>
  );
}
