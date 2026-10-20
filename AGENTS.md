# Mi Caja — notas para agentes

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
pnpm db:backup      # backup de los datos a prisma/backups/ (CSV por tabla)
pnpm lint           # ESLint
```

## Backups de la base de datos

**SIEMPRE hacer backup antes de cualquier wipe o migrate destructivo.** Los datos son reales y representan el trabajo del usuario.

### Hacer backup

```bash
# Backup en CSV (recomendado, preserva tipos de datos)
./scripts/backup.sh

# Backup en JSON (vía Prisma)
pnpm exec tsx prisma/backup.ts
```

Los archivos se guardan en `prisma/backups/backup-<timestamp>/` con un archivo `.csv` por tabla. El directorio está en `.gitignore` porque los datos son reales y no deben commitearse.

### Restaurar backup

```bash
# Restaurar una tabla específica
psql "$DATABASE_URL" -c "\COPY public.\"<tabla>\" FROM 'prisma/backups/backup-<timestamp>/<tabla>.csv' WITH (FORMAT CSV, HEADER TRUE)"
```

### Time Travel de Neon (último recurso)

Si la DB está vacía o los datos están corruptos, usar el Time Travel de Neon desde la consola web:
- https://console.neon.tech → proyecto → rama `main` → Time Travel
- Seleccionar un punto anterior al wipe (Neon guarda hasta **6 horas** en el plan gratuito)
- Después de restaurar, correr backup inmediatamente

## Datos del seed

- 1 ADMIN (`admin@ejemplo.com` / `admin123`)
- 1 CAJERO (`cajero@ejemplo.com` / `cajero123`)
- 37 proveedores, 56 gastos, 3 retiros, 13 Transferencia, 18 cierres, 7 pedidos (nota)

Período: 02/09/2026 al 19/09/2026.

## Filtros y agrupación por mes

Las páginas con listas (`/gastos`, `/retiros`, `/transferencia`, `/cierre`)
comparten el mismo patrón de filtros vía URL, server-side:

- **`?mes=YYYY-MM`**: atajo a un mes completo. Si está presente, manda
  sobre `desde`/`hasta`. Si se setea el mes, se borran `desde`/`hasta`.
- **`?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`**: rango manual.
- **Filtros específicos**: cada página acepta sus propios keys (ver abajo).

**Componentes compartidos:**
- `src/components/filtros/month-selector.tsx`: dropdown cliente que
  navega automáticamente al cambiar de mes, preservando otros params.
- `src/components/filtros/filtros-bar.tsx`: `<form method="GET">` con
  datepickers `desde`/`hasta` y slot `children` para filtros específicos.
  Layout responsive: desktop horizontal, mobile wrap.
- `src/components/filtros/multi-select.tsx`: Popover + checkboxes + badges.
  Reemplaza el `<select multiple>` nativo, que es feo y no respeta el
  design system. Emite `<input type="hidden" name=>` por valor para que
  el form GET los recoja como multi-value form fields.
- `src/lib/search-params.ts`: `parseFiltrosComunes()` y `filtrosToQuery()`
  — toda la resolución mes > rango > default vive aquí.

**Páginas y sus filtros específicos:**

| Página | Filtros extra (URL key → UI) |
|---|---|
| `/gastos` | `proveedores` (multi-select), `pagadoCon` (multi), `q` (texto en proveedor/nota), `agrupar=1` (activa agrupación por mes). Ver `gastos-filtros-extra.tsx`. |
| `/retiros` | `tipo` (multi), `saleDe` (multi), `q` (texto en concepto/nota), `agrupar=1`. Ver `retiros-filtros-extra.tsx`. |
| `/transferencia` | Sin filtros extra. Solo mes + fechas (un renglón por día). |
| `/cierre` | Sin filtros extra. Solo mes + fechas (es una serie computada). |

**Agrupación por mes:**
Cuando `?agrupar=1` está activo, las páginas `/gastos` y `/retiros`
muestran bloques por mes (con `<section>` + subtotal) en lugar de la
lista plana. La page calcula los grupos a partir del campo `fecha`;
cada grupo se renderiza con su propio `<ResponsiveTable>` (un patrón
aprovechado sin tocar el componente compartido).

**Patrón de filtros específicos por página (controlado):**
Los slots children del FiltrosBar (e.g. `gastos-filtros-extra.tsx`,
`retiros-filtros-extra.tsx`) son **controlados**: exponen callbacks
`onXChange` en vez de estado interno. La view del cliente mantiene
un único `estadoFiltros` (sincronizado con la URL efectiva vía ref)
y propaga los cambios. Esto evita loops de re-render y mantiene
coherencia entre los inputs nativos y el submit del form.

**Patrón de page nueva con filtros:**
1. Importar `parseFiltrosComunes` y leerlo en la page (server component).
2. Pasar a la view: `desde`, `hasta`, `mes`, filtros específicos efectivos.
3. Renderizar `<MonthSelector>` arriba y `<FiltrosBar>` debajo.
4. Si la página tiene filtros específicos propios, pasarlos como
   `children` del `<FiltrosBar>`. El form los recoge por nombre.
5. Si la página agrega agrupación por mes: calcular grupos y renderizar
   un bloque por mes.

**Importante:** los inputs nativos del slot usan `name=` para mantener
la convención del form GET. Los multi-select reciben una key con valores
CSV (ej. `?proveedores=id1,id2`), y la page los parsea.

## Motor de cálculo

`src/lib/calc.ts` es la fuente de verdad para todos los totales mostrados. NO
calcular totales en las páginas — siempre pasar por las funciones del módulo.
Todas las columnas "computadas" (efectivo acumulado, Transferencia acumulado, total
gastos del día, entrada estimada, descuadre) salen de
`computeCierreDiario`/`serieCierres`/`balanceGeneral`.

## Próximas fases

- **Fase 3**: export a Excel, integración con Transferencia API.

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
