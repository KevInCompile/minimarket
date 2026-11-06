# Mi Caja

Reemplazo del Excel `Control_Caja_Septiembre_2026.xlsx` para el control de caja
diario de una tienda. Mismo flujo de trabajo que el Excel (gastos pagados de caja / de
efectivo, retiros, Transferencia, cierre diario con acumulado de efectivo y Transferencia,
descuadres), pero como aplicación web multi-tenant con roles, trazabilidad por
usuario y motor de cálculo.

> El `.xlsx` no está en el repo: es el archivo original que la app reemplaza.
> La fixture con la que se verifica la paridad vive en `tests/calc.test.ts`.

## Stack

- **Next.js 16** (App Router, Turbopack, RSC)
- **React 19**
- **TypeScript**
- **Postgres** + **Prisma 6**
- **NextAuth v5** (Credentials)
- **Tailwind 4** + **shadcn/ui (preset nova / Base UI)**
- **Recharts**
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
  auth.ts                              NextAuth config (Credentials, JWT, roles)
  proxy.ts                             auth + RBAC (renombrado desde middleware en Next 16)
  app/
    layout.tsx                       root layout (theme, fonts)
    globals.css
    login/page.tsx                   formulario de inicio de sesión
    forbidden/page.tsx               403 cuando el cajero entra a una zona admin
    registro/                        alta publica: crea tienda + usuario ADMIN
    api/auth/[...nextauth]/route.ts  handler NextAuth
    api/health/route.ts              healthcheck de DB + config de Auth
    (app)/
      layout.tsx                     layout autenticado (sidebar + theme + logout)
      page.tsx                       dashboard "Balance general"
      balance-cards.tsx              4 tarjetas KPI con tendencia
      dashboard-charts.tsx           evolución + donuts de formas de pago
      gastos/                        tabla + alta multiple de gastos
      retiros/                       tabla + alta de retiros (solo ADMIN)
      transferencia/                         tabla inline de Transferencia recibido
      cierre/                        cierre diario con columnas calculadas
      pedidos/                       pedidos (nota), solo lectura
      proveedores/                   CRUD de proveedores
      usuarios/                      CRUD de usuarios (solo ADMIN)
      configuracion/                 dia de corte del periodo contable
  components/                        shadcn/ui + filtros compartidos + theme provider
  lib/
    db.ts                            singleton Prisma
    dates.ts                         helpers UTC + serial Excel → Date
    format.ts                        formatCOP, formatPercent, formatNumber
    format-relative.ts               formatDistanceToNow
    calc.ts                          motor de cálculo (testeado contra el Excel)
    nav.ts                           catálogo del menú (fuente única para desktop y mobile)
    search-params.ts                 resolución mes > rango > default
    saldos.ts                        saldos iniciales acumulados por tienda
    auth-guard.ts                    requireValidUser / requireAdmin / requireTienda
  server/actions/                    server actions por entidad
prisma/
  schema.prisma                      Tienda, User, Proveedor, Gasto, Retiro,
                                     TransferenciaDia, CierreDiario, PedidoNota
  seed.ts                            genera datos de prueba deterministas
  seed-data.ts                       generador de datos (12 meses, por semilla)
  backup.ts                          backup JSON por tabla
  migrations/
scripts/
  backup.sh / restore.sh             backup y restore en CSV
tests/
  calc.test.ts                       32 tests de paridad contra el Excel
  search-params.test.ts              64 tests de resolución de filtros
  seed.test.ts                       19 tests del generador y las guardas del seed
  nav.test.ts                        2 tests del catálogo de navegación
next.config.ts                       habilita experimental.authInterrupts
```

## Motor de cálculo (`src/lib/calc.ts`)

Funciones puras, testeables:

- `computeCierreDiario(cierre, gastos, retiros, transferencia, prevEfec, prevNequi)` — calcula todas las columnas de un día.
- `serieCierres({ desde, hasta, cierres, gastos, retiros, transferencia })` — devuelve la serie completa con acumulados.
- `balanceGeneral({ desde, hasta, ... })` — resumen del periodo.
- `rankingProveedores(gastos)` — top por proveedor con porcentaje.

Reglas (copiadas del Excel):

- Gastos con `pagadoCon=CAJA` salen de la caja del día (no tocan el efectivo guardado).
- Gastos con `pagadoCon=EFECTIVO` salen del efectivo acumulado.
- Gastos con `pagadoCon=TRANSFERENCIA` salen del saldo Transferencia.
- Retiros con `saleDe=EFECTIVO` salen del efectivo acumulado.
- Retiros con `saleDe=TRANSFERENCIA` salen del saldo Transferencia acumulado.
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

Totales de la fixture del Excel September 2026 (verificables con `pnpm test`,
viven en `tests/calc.test.ts`):

- Total gastos: **$2.750.878**
- Retiros efectivo: $900.000 · Retiros Transferencia: $300.000
- Transferencia recibido: $898.200
- Punto más bajo del efectivo acumulado: $210.000 (Miércoles 02/09)
- Descuadre Jueves 17/09: **−$93.777** (sobrante en libros vs conteo real de $438.000)

El `pnpm db:seed` **no** replica el Excel: genera datos sintéticos
deterministas (`prisma/seed-data.ts`) para 12 meses, con la misma semilla
siempre produce los mismos números.

## Roles

| Acción                                | ADMIN | CAJERO |
| ------------------------------------- | :---: | :----: |
| Ver dashboard                         |   ✓   |   ✓    |
| Crear gastos                          |   ✓   |   ✓    |
| Borrar / restaurar gastos             |   ✓   |   ✗    |
| Crear / editar cierre diario          |   ✓   |   ✓    |
| Borrar cierre diario                  |   ✓   |   ✗    |
| Crear / editar Transferencia del día  |   ✓   |   ✓    |
| Crear / borrar retiros                |   ✓   |   ✗    |
| Gestionar proveedores / usuarios      |   ✓   |   ✗    |
| Ver pedidos (nota)                    |   ✓   |   ✗    |
| Configurar el día de corte            |   ✓   |   ✗    |

El proxy (`src/proxy.ts`) bloquea `/retiros`, `/pedidos`, `/proveedores`,
`/usuarios` y `/configuracion` para el cajero y lo manda a `/forbidden`. Los
server actions vuelven a chequear el rol antes de mutar la base.

Los datos están aislados por tienda: cada registro operativo lleva `tiendaId`
y todas las consultas lo filtran.

## Roadmap

- **Fase 1 (MVP):** ✅ Schema, seed, auth, RBAC, CRUD completo, dashboard con cards y chart.
- **Multi-tenant:** ✅ tabla `Tienda`, aislamiento por `tiendaId`, día de corte por tienda, alta pública de tienda.
- **Pendiente:** export a Excel/CSV, PWA instalable + offline, API REST + JWT para la app móvil, reportes imprimibles, Transferencia API, auditoría de cambios, paginación real en `/gastos` y `/retiros`.

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
