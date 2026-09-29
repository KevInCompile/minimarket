/**
 * Helpers para los State types de useActionState.
 * El timestamp se usa en useEffect para detectar respuestas nuevas
 * y disparar toasts sin volver a mostrarlos en cada render.
 */
export type ActionState =
  | { ok: true; ts: number; error?: undefined }
  | { ok: false; error: string; field?: string; ts: number };

export function okState(): ActionState {
  return { ok: true, ts: Date.now() };
}

export function errState(error: string, field?: string): ActionState {
  return { ok: false, error, field, ts: Date.now() };
}

export const INITIAL_ACTION_STATE: ActionState = { ok: true, ts: 0 };
