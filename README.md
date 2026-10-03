# minimarket

Reemplazo del Excel `Control_Caja_Septiembre_2026.xlsx` para el control de caja
de un minimarket. Mismo flujo de trabajo que el Excel (gastos pagados de caja / de
efectivo, retiros, Nequi, cierre diario con acumulado de efectivo y Nequi,
descuadres), pero como aplicación web con roles, auditoría y motor de cálculo.

## Stack

- **Next.js 16** (App Router, Turbopack, RSC)
- **React 19**
- **TypeScript**
- **Postgres** + **Prisma 6**
- **NextAuth v5** (Credentials)
- **Tailwind 4** + **shadcn/ui (preset nova / Base UI)**
- **Recharts** + **SheetJS (xlsx)**
- **Vitest**

## Empezar

### Opción A: Postgres local (desarrollo en tu Mac)

```bash
brew install postgresql@16
brew services start postgresql@16
createdb minimarket    # o: psql -U $USER -d postgres -c "CREATE DATABASE minimarket;"
cp .env.example .env
# Editá DATABASE_URL: "postgresql://$USER@localhost:5432/minimarket?schema=public"
pnpm install
pnpm exec prisma migrate deploy
pnpm db:seed
pnpm dev
```

Abrí <http://localhost:3000>.

### Opción B: Neon (desarrollo y producción, recomendado)

**1. Crear proyecto en Neon**

- Ir a <https://console.neon.tech> y crear cuenta (gratis)
- Click "Create a project" (region US East o AWS cercano a tu Vercel)
- Neon crea una DB `neondb` con un usuario `neondb_owner`

**2. Obtener connection string**

En Neon → Project Dashboard → "Connection Details":
- Copiar la **pooled connection string** (la que tiene `-pooler` en el hostname)
- Formato: `postgresql://neondb_owner:XXXXX@ep-XXXXX-pooler.XXXXX.aws.neon.tech/neondb?sslmode=require`

**3. Configurar variables de entorno**

```bash
cp .env.example .env
# Pegar la URL de Neon en DATABASE_URL (NO commitear .env)
# Generar AUTH_SECRET:
openssl rand -base64 32
```

**4. Aplicar migraciones y seed**

```bash
pnpm install
pnpm exec prisma migrate deploy
pnpm db:seed
pnpm dev
```

### Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Connection string de Postgres (local o Neon) | `postgresql://user:pwd@host/db?sslmode=require` |
| `AUTH_SECRET` | String aleatorio de 32+ chars para firmar JWTs | Generar con `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Requerido en deploys no-locales (Vercel, etc.) | `true` |

> **Importante:** `.env` está en `.gitignore`. NO commitear las credenciales.

## Estructura

```
src/
  app/
    layout.tsx                       root layout (theme, fonts)
    globals.css
    login/page.tsx                   formulario de inicio de sesión
    forbidden/page.tsx               403 cuando el cajero entra a una zona admin
    api/auth/[...nextauth]/route.ts  handler NextAuth
    (app)/
      layout.tsx                     layout autenticado (sidebar + theme + logout)
      page.tsx                       dashboard "Balance general"
      gastos/                        tabla + alta de gastos
      retiros/                       tabla + alta de retiros (solo ADMIN)
      nequi/                         tabla inline de Nequi recibido
      cierre/                        cierre diario con columnas calculadas
      pedidos/                       pedidos (nota), solo referencia
      proveedores/                   CRUD de proveedores
      usuarios/                      CRUD de usuarios (solo ADMIN)
      importar/                      importador .xlsx (Fase 2)
  components/                        shadcn/ui + theme provider
  lib/
    db.ts                            singleton Prisma
    dates.ts                         helpers UTC + serial Excel → Date
    format.ts                        formatCOP, formatPercent, formatShortDate
    format-relative.ts               formatDistanceToNow
    calc.ts                          motor de cálculo (testeado contra el Excel)
    excel-parser.ts                  parser SheetJS (path y Buffer)
    excel-staging.ts                 staging dir para uploads antes del commit
  server/actions/                    server actions por entidad
prisma/
  schema.prisma                      User, Proveedor, Gasto, Retiro, NequiDelDia,
                                     CierreDiario, PedidoNota, ImportLog
                                     (+ importId, snapshot)
  seed.ts                            lee del Excel y replica los datos
  migrations/
tests/
  calc.test.ts                       6 tests de paridad contra el Excel
  import.test.ts                     4 tests del flujo import (parser + revert)
proxy.ts                             auth + RBAC (renombrado desde middleware en Next 16)
auth.ts                              NextAuth config (Credentials, JWT, roles)
next.config.ts                       habilita experimental.authInterrupts
```

## Importador `.xlsx` (Fase 2)

Solo accesible por ADMIN en `/importar`.

**Flujo:**
1. Admin sube un `.xlsx` → server action `parseImportAction` valida el archivo
   (extensión, tamaño < 10 MB), lo guarda en un staging dir (`os.tmpdir()`)
   con un ID derivado del hash del contenido, y devuelve un `ImportPreview`
   con: totales por hoja, gastos por tipo (Caja/Efectivo), top 10 gastos,
   y todas las advertencias (placeholders creados, días sin cierre, etc.).
2. El admin revisa el preview. Si algo está mal, puede cancelar y subir otro.
3. Click "Confirmar y reemplazar datos" → server action `commitImportAction`:
   - Toma un snapshot de los datos actuales (gastos, retiros, nequi, cierres,
     pedidos) en el campo `ImportLog.snapshot` (Json).
   - En una transacción Prisma: borra todo (excepto usuarios y proveedores),
     crea el `ImportLog`, upsert de proveedores, inserta los nuevos registros
     con `importId` apuntando al log.
   - Borra el archivo staging.
4. Cada import queda en el historial. Botón "Revertir" → `revertImportAction`:
   restaura desde el snapshot, marca el log como `revertido`.

**Advertencias automáticas:**
- Para días donde el Cierre diario tiene gastos totales pero la hoja Gastos
  no tiene NINGÚN registro, crea un gasto "Varios (importado)" con el total.
- Si un día tiene gastos pero no tiene cierre, se reporta.

**Restricciones:**
- El Excel debe tener las mismas hojas que `Control_Caja_*.xlsx`:
  Balance general, Gastos, Retiros, Nequi, Cierre diario, Pedidos (nota).
- Las hojas que no se encuentran se reportan como warning pero no abortan.
- Tamaño máximo: 10 MB.
- Si el archivo temporal expira (se reinicia el servidor), el admin verá
  un mensaje claro pidiéndole re-subirlo.

## Motor de cálculo (`src/lib/calc.ts`)

Funciones puras, testeables:

- `computeCierreDiario(cierre, gastos, retiros, nequi, prevEfec, prevNequi)` — calcula todas las columnas de un día.
- `serieCierres({ desde, hasta, cierres, gastos, retiros, nequi })` — devuelve la serie completa con acumulados.
- `balanceGeneral({ desde, hasta, ... })` — resumen del periodo.
- `rankingProveedores(gastos)` — top por proveedor con porcentaje.

Reglas (copiadas del Excel):

- Gastos con `pagadoCon=CAJA` salen de la caja del día (no tocan el efectivo guardado).
- Gastos con `pagadoCon=EFECTIVO` salen del efectivo acumulado.
- Retiros con `saleDe=EFECTIVO` salen del efectivo acumulado.
- Retiros con `saleDe=NEQUI` salen del saldo Nequi acumulado.
- `efectivoAcumulado(día) = anterior + guardado − gastosEfvo − retirosEfvo`.
- `descuadre = efectivoRealContado − efectivoAcumulado` (solo si hay conteo real).

## Tests

```bash
pnpm test
```

Los tests reproducen los totales de las hojas transaccionales del Excel
original. **No coinciden exactamente con los totales hardcodeados de la hoja
"Balance general" del Excel** — esos totales eran manuales y arrastraban
inconsistencias con las transacciones. El sistema usa las transacciones como
única fuente de verdad.

Totales del seed (verificables con `pnpm test`):

- Total gastos: **$2.750.878**
- Retiros efectivo: $900.000 · Retiros Nequi: $300.000
- Nequi recibido: $898.200
- Punto más bajo del efectivo acumulado: $210.000 (Miércoles 02/09)
- Descuadre Jueves 17/09: **−$93.777** (sobrante en libros vs conteo real de $438.000)

## Roles

| Acción                          | ADMIN | CAJERO |
| ------------------------------- | :---: | :----: |
| Ver dashboard                   |   ✓   |   ✓    |
| Crear / editar / borrar gastos  |   ✓   | solo del día actual, no borrar |
| Crear / editar cierre diario    |   ✓   |   ✓    |
| Crear / editar Nequi del día    |   ✓   |   ✓    |
| Crear retiros                   |   ✓   |   ✗    |
| Gestionar proveedores / usuarios|   ✓   |   ✗    |
| Ver / editar pedidos (nota)     |   ✓   |   ✗    |
| Importar Excel                  |   ✓   |   ✗    |

El proxy (`src/proxy.ts`) chequea la sesión JWT y redirige a `/forbidden` cuando
un cajero intenta entrar a una ruta solo-admin. Los server actions vuelven a
chequear el rol antes de mutar la base.

## Roadmap

- **Fase 1 (MVP):** ✅ Schema, seed, auth, RBAC, CRUD completo, dashboard con cards y chart.
- **Fase 2 (Importador):** ✅ UI para subir `.xlsx`, preview con totales, transacción atómica, snapshot para revertir.
- **Fase 3:** Multi-tienda, PWA, export a Excel, reportes.
- **Fase 4:** Integraciones (Nequi API, facturación electrónica).

## Deploy a Vercel

1. **Repo en GitHub** (ya está).
2. **Crear proyecto en Neon** ([console.neon.tech](https://console.neon.tech)) y obtener la pooled connection string.
3. **Configurar variables en Vercel** (Settings → Environment Variables):
   - `DATABASE_URL` → pooled connection string
   - `AUTH_SECRET` → generá con `openssl rand -base64 32`
   - `AUTH_TRUST_HOST` → `true`
4. **Deploy.** Vercel corre `pnpm install` (que ejecuta `postinstall: prisma generate`) y luego `pnpm run build`.
5. **Primera vez:** correr el seed apuntando a Neon:
   ```bash
   DATABASE_URL="postgresql://neondb_owner:XXXX@ep-XXXX-pooler..." pnpm db:seed
   ```

> El `postinstall: "prisma generate"` ya está en `package.json`, así Vercel genera el cliente Prisma correctamente aunque tenga los build scripts deshabilitados.
