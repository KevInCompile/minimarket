"use client";

import { toast } from "sonner";

/**
 * Helpers para mensajes consistentes en toda la app.
 * Usar siempre estas funciones en vez de toast() directo.
 */

export function toastSuccess(message: string, description?: string) {
  toast.success(message, { description });
}

export function toastError(message: string, description?: string) {
  toast.error(message, { description });
}

export function toastInfo(message: string, description?: string) {
  toast.info(message, { description });
}

export function toastWarning(message: string, description?: string) {
  toast.warning(message, { description });
}

export function toastLoading(message: string) {
  return toast.loading(message);
}

export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: unknown) => string);
  },
) {
  return toast.promise(promise, messages);
}

/**
 * Toast con botón "Deshacer" por 5 segundos.
 * `action` se ejecuta si el usuario hace click.
 */
export function toastUndo(
  message: string,
  description: string,
  action: () => void | Promise<void>,
  options?: { duration?: number },
) {
  toast(message, {
    description,
    duration: options?.duration ?? 5000,
    action: {
      label: "Deshacer",
      onClick: () => {
        void Promise.resolve(action());
      },
    },
    cancel: {
      label: "Descartar",
      onClick: () => {},
    },
  });
}
