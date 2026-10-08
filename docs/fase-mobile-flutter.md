# Plan: App móvil Flutter con backend Next.js

> **Status**: pendiente. Se hace cuando la web esté completa y estable.
> **Decisión del usuario**: Flutter (no Capacitor ni Expo) + sin publicar en stores.
> **Distribución local**: iPhone (sin App Store) + APK Android sideloadeado.

## Arquitectura

```
┌─────────────────┐         ┌─────────────────┐
│  Flutter app    │  HTTP   │  Next.js API    │
│  (iOS/Android)  │ ◄─────► │  (ya deployed)   │
│                 │  JWT    │                 │
└─────────────────┘         └─────────────────┘
```

- **Backend**: el actual. Le agregamos endpoints REST con JWT auth (las server actions siguen funcionando para la web).
- **Mobile**: app nueva escrita en Flutter, hace fetch al backend.
- **Auth**: JWT firmado con `AUTH_SECRET` (misma secret que NextAuth). Mismo `uid` y `role`.

## Stack Flutter

- **Framework**: Flutter 3.x (Dart 3.x)
- **HTTP**: `dio` con interceptor para agregar `Authorization: Bearer <token>`
- **Storage seguro**: `flutter_secure_storage` (Keychain en iOS, EncryptedSharedPreferences en Android)
- **Estado**: Riverpod 2.x (`AsyncNotifier` para auth, `FutureProvider.family` para listas filtradas)
- **HTTP code-gen**: `openapi_generator` con el OpenAPI del backend
- **Tema**: verde esmeralda primary + grises (consistente con la web)
- **Font**: Inter

## Fases

### Fase 1 — Backend: API REST + JWT (3-5 días)

#### Helpers nuevos

- `src/lib/jwt.ts`
  - `signToken(payload, expiresIn = "30d")` — firma con HS256
  - `verifyToken(token)` — devuelve payload o `null`
  - Errores tipados (`TokenExpiredError`, `InvalidTokenError`)

- `src/lib/mobile-auth.ts`
  - `getMobileUser(req)` — extrae user del JWT del header `Authorization: Bearer ...`
  - `requireMobileUser(req)` — devuelve user o `Response(401)`
  - `requireMobileAdmin(req)` — devuelve user o `Response(401|403)`

- `src/lib/mobile-schemas.ts` — zod schemas reusables
  - `gastoInputSchema`, `retiroInputSchema`, `cierreInputSchema`, `nequiInputSchema`
  - `loginInputSchema`

- `src/lib/rate-limit.ts` — rate limiting simple en memoria
  - `checkRateLimit(key, max = 5, windowMs = 60_000)`
  - Para producción: Upstash Ratelimit + Redis

- `src/lib/mobile-openapi.ts` — generador de OpenAPI
  - `getOpenApiSpec()` — retorna el JSON del spec
  - Define paths, schemas, security

#### Endpoints nuevos (todos bajo `/api/mobile/v1/`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/login` | público | Login con email/password → `{token, user}` |
| POST | `/auth/logout` | user | Logout (opcional, JWT es stateless) |
| GET | `/auth/me` | user | Devuelve user actual desde el JWT |
| GET | `/balance?desde=&hasta=` | user | Total disponible + breakdown del periodo |
| GET | `/gastos?desde=&hasta=` | user | Lista gastos del periodo |
| POST | `/gastos` | user | Crea gasto |
| DELETE | `/gastos/[id]` | admin | Elimina gasto |
| GET | `/retiros?desde=&hasta=` | user | Lista retiros del periodo |
| POST | `/retiros` | admin | Crea retiro |
| DELETE | `/retiros/[id]` | admin | Elimina retiro |
| GET | `/nequi?desde=&hasta=` | user | Lista Nequi por día |
| PUT | `/nequi` | user | Upsert Nequi del día |
| GET | `/cierre?desde=&hasta=` | user | Lista cierres del periodo |
| POST | `/cierre` | user | Crea cierre |
| PUT | `/cierre/[fecha]` | user | Actualiza cierre |
| GET | `/proveedores` | user | Lista proveedores |
| POST | `/proveedores` | admin | Crea proveedor |
| PATCH | `/proveedores/[id]` | admin | Activa/desactiva |
| GET | `/openapi.json` | público | OpenAPI 3.1 spec (para code-gen) |

#### Patrón uniforme

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMobileUser, requireMobileAdmin } from "@/lib/mobile-auth";

const schema = z.object({...});

export async function GET(req: Request) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({error: "unauthorized"}, {status: 401});
  // ...lógica
  return NextResponse.json({data: resultado});
}

export async function POST(req: Request) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({error: "unauthorized"}, {status: 401});

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {error: "invalid", issues: parsed.error.issues},
      {status: 400}
    );
  }
  // ...lógica
  return NextResponse.json({ok: true, data: resultado});
}
```

#### Formato de respuesta

Éxito:
```json
{ "data": {...} }
```

Error:
```json
{ "error": "unauthorized", "message": "..." }
```

Con status code apropiado (401/403/400/404/500).

#### JWT payload

```ts
{
  uid: string;     // user id
  role: "ADMIN" | "CAJERO";
  email: string;
  iat: number;
  exp: number;
}
```

Firmado con `AUTH_SECRET` (misma que NextAuth), HS256, expiración 30 días.

#### Verificación de seguridad

- **JWT_SECRET**: reuso de `AUTH_SECRET` — si rotás la secret por seguridad, todos los tokens mobile quedan inválidos (documentar)
- **HTTPS obligatorio en producción** (Vercel lo maneja)
- **Rate limiting en login**: 5 intentos/min por email
- **Password verify** con `bcrypt.compare`
- **No incluir password** en ninguna respuesta
- **CORS no necesario** (Flutter no es browser, no hace preflight)

#### Server actions existentes

**No se tocan**. Siguen funcionando para la web. Mobile consume los nuevos route handlers REST. Cero cambios en server actions.

### Fase 2 — App Flutter (3-4 semanas)

#### Setup

```bash
flutter create minimarket
cd minimarket
flutter pub add dio flutter_secure_storage json_annotation
flutter pub add --dev build_runner json_serializable
```

#### Estructura del proyecto

```
lib/
  main.dart
  config/
    api_client.dart       # Dio con interceptor JWT
    storage.dart          # flutter_secure_storage para tokens
  models/                 # generadas desde OpenAPI
    user.dart
    gasto.dart
    retiro.dart
    nequi.dart
    cierre.dart
    proveedor.dart
  features/
    auth/
      login_screen.dart
      auth_state.dart       # Riverpod AsyncNotifier
    dashboard/
      dashboard_screen.dart
      balance_card.dart
    gastos/
      gastos_list_screen.dart
      gasto_form_screen.dart
    retiros/
      retiros_list_screen.dart
      retiro_form_screen.dart
    nequi/
      nequi_screen.dart
    cierre/
      cierre_list_screen.dart
    proveedores/
      proveedores_screen.dart
  shared/
    app_theme.dart          # verde esmeralda + gris
    money_input.dart
    confirm_dialog.dart
```

#### Estado (Riverpod 2.x)

- `authStateProvider`: `AsyncNotifier<User?>` con login/logout/me
- `gastosListProvider(family)`: `FutureProvider<List<Gasto>>` filtrado por rango de fechas
- Similar para retiros, nequi, cierre, proveedores

#### Pantallas (1:1 con la web)

1. **Login** — email + password, submit a `/auth/login`, guarda token en `flutter_secure_storage`
2. **Dashboard** — cards con TOTAL DISPONIBLE HOY, EFECTIVO GUARDADO, SALDO NEQUI, etc
3. **Gastos** — lista + form
4. **Retiros** — lista + form (solo admin)
5. **Nequi** — tabla por día
6. **Cierre diario** — cards expandibles
7. **Pedidos (nota)** — solo lectura
8. **Proveedores** — lista + activar/desactivar

#### Tema

- Verde esmeralda primary + grises
- Light/dark mode automático (sigue el sistema)
- Inter font
- `bg-linear-to-br` para gradientes (consistente con la web)

### Fase 3 — Build + instalación local (1-2 días)

#### iPhone (sin App Store)

| Opción | Costo | Renovación | Dificultad |
|---|---|---|---|
| **Free provisioning** (Apple ID gratis) | $0 | Cada 7 días, requiere reconectar a Xcode | Baja |
| **Apple Developer Program** | $99/año | Anual | Baja |
| **AltStore / sideload** | $0 | Auto con AltServer corriendo | Media |

**Recomendación**: empezar con **AltStore** (instala la app y la re-firma automáticamente cada 7 días). Sin cuenta de developer, gratis. Para uso permanente: Apple Developer Program ($99/año, dura 1 año).

#### Build iOS

```bash
cd ios
xcodebuild -workspace Runner.xcworkspace -scheme Runner -configuration Release -sdk iphoneos -allowProvisioningUpdates
# o con flutter:
flutter build ios --release
```

#### Android (sideload)

```bash
flutter build apk --release
# → build/app/outputs/flutter-apk/app-release.apk
adb install app-release.apk   # con USB debugging
# o enviate el APK por mail/airdroid y abrílo
```

Sin cuenta de Google Play necesaria.

## Estimación de tiempo

| Fase | Días |
|---|---|
| 1. Backend API REST | 3-5 |
| 2. App Flutter (8 pantallas + auth) | 18-25 |
| 3. Build + instalación local | 1-2 |
| **Total** | **22-32 días** |

## Trade-offs

**A favor:**
- Reutilizás 100% del backend (cero migración de datos, cero duplicación de lógica)
- `lib/calc.ts` queda como single source of truth para los cálculos
- Auth y roles (admin/cajero) se manejan en un solo lugar
- OpenAPI genera tipos Dart automáticamente (no drift)

**En contra:**
- Tenés que mantener dos clientes (Flutter + la web)
- Flutter NO comparte componentes con React
- Si cambiás una regla de negocio en el backend, hay que actualizar los tipos en Flutter
- ~1 mes de trabajo hasta tener algo usable

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Framework mobile | **Flutter** |
| Plataformas | iOS + Android |
| Distribución | **Local** (sin App Store / Play Store) |
| Stack backend auth | **`jose` library** + `AUTH_SECRET` reusado |
| Ruta base | **`/api/mobile/v1/`** |
| Tipos Flutter | **OpenAPI + code-gen** |
| Server actions web | **No se tocan**, siguen funcionando |
| Rate limiting | En memoria para MVP, Upstash+Redis en producción |
| Expiración JWT | 30 días |
| Tema | Verde esmeralda + grises (igual que web) |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Rotación de `AUTH_SECRET` invalida tokens mobile | Documentar bien. Solo rotar si hay compromiso de seguridad. |
| JWT size grande | Payload mínimo: solo `uid`, `role`, `email` |
| CORS en mobile | No necesario (Flutter no es browser) |
| Rate limiting en serverless (Vercel) | Memoria no compartida entre instancias. Para producción: Upstash Ratelimit. |
| Drift entre OpenAPI y tipos Dart | OpenAPI es la fuente. Regenerar tipos en cada cambio de API. |

## Entregables

1. **Fase 1**: Backend con endpoints REST + tests + OpenAPI + deploy en Vercel + README
2. **Fase 2**: App Flutter completa, pantallas funcionales, build APKs de prueba
3. **Fase 3**: App instalada en iPhone del user + APK Android funcional

## Cómo retomar cuando sea el momento

1. Revisar este plan
2. Confirmar el stack final
3. Instalar `jose` y arrancar con la Fase 1 (backend)
4. Una vez funcionando el backend, arrancar Flutter
