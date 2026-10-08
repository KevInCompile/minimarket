# minimarket — notas para agentes

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Convenciones del proyecto

- **Next.js 16**: usar `proxy.ts` (NO `middleware.ts`). Función `proxy` exportada. APIs async (`await params`, `await searchParams`).
- **Tailwind 4** con preset **shadcn nova** (Base UI, no Radix). Button NO tiene `asChild` — usar `buttonVariants({ variant: "default" })` con `<Link>` o `render`.
- **NextAuth v5** (Auth.js beta). Config en `src/auth.ts`, route handler en `src/app/api/auth/[...nextauth]/route.ts`, server actions importan `signIn`/`signOut` de `@/auth`.
- **Prisma 6** (no 7/8). Client singleton en `src/lib/db.ts`. Enums: `Role`, `PagadoCon`, `SaleDe`.
- **Fechas siempre en UTC** (`src/lib/dates.ts`) para evitar saltos por zona horaria. Los seriales del Excel se convierten con `excelSerialToDate(serial)`.
- **Server actions** en `src/server/actions/<entidad>.ts`. Exportan funciones `useActionState`-friendly que devuelven `{ ok?: true, error?: string }`.
- **Páginas autenticadas** viven en `src/app/(app)/` con sidebar y theme provider.
- **RBAC**: rutas `/retiros`, `/pedidos`, `/proveedores`, `/usuarios`, `/importar` son solo ADMIN. El proxy redirige a `/forbidden` si el cajero intenta entrar.

## Comandos frecuentes

```bash
pnpm dev            # dev server (Turbopack, puerto 3000)
pnpm build          # build de producción
pnpm test           # tests Vitest (paridad con el Excel)
pnpm db:seed        # ejecuta prisma/seed.ts
pnpm db:studio      # Prisma Studio
pnpm db:reset       # drop + recreate + seed
pnpm lint           # ESLint
```

## Datos del seed

- 1 ADMIN (`admin@ejemplo.com` / `admin123`)
- 1 CAJERO (`cajero@ejemplo.com` / `cajero123`)
- 37 proveedores, 56 gastos, 3 retiros, 13 Nequi, 18 cierres, 7 pedidos (nota)

Período: 02/09/2026 al 19/09/2026.

## Motor de cálculo

`src/lib/calc.ts` es la fuente de verdad para todos los totales mostrados. NO
calcular totales en las páginas — siempre pasar por las funciones del módulo.
Todas las columnas "computadas" (efectivo acumulado, Nequi acumulado, total
gastos del día, entrada estimada, descuadre) salen de
`computeCierreDiario`/`serieCierres`/`balanceGeneral`.

## Próximas fases

- **Fase 3**: export a Excel, integración con Nequi API.

## Importador (Fase 2)

- **Parser**: `src/lib/excel-parser.ts` (funciona con path o Buffer).
- **Staging**: `src/lib/excel-staging.ts` guarda uploads en `os.tmpdir()` con hash-based ID.
- **Server actions**: `src/server/actions/import.ts` con `parseImportAction` (preview), `commitImportAction` (atomic con snapshot), `revertImportAction` (restaura desde snapshot).
- **Schema**: cada tabla tiene `importId?` apuntando al log; el log tiene `snapshot Json?` con el estado pre-import.
- **UI**: `/importar` con upload form + preview + historial con botón revertir.
- **Reglas del parser**:
  - Filtra filas TOTAL/footer usando `MIN_VALID_SERIAL = 39814` (Excel 2009+).
  - Para días en Cierre diario con gastos totales pero sin registros en Gastos, crea un gasto "Varios (importado)" para que cuadren los totales.
- **Tests**: `tests/import.test.ts` cubre parse + roundtrip commit/revert (10/10 pasando).
