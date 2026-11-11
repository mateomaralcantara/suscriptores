# Growth Reseller Lab

Panel de revendedores en Next.js 16: catálogo, pedidos, cartera, cancelaciones, refills y API REST con clave.

## Qué hace de verdad

- **Autenticación real**: registro e inicio de sesión con contraseñas `scrypt`, sesión en cookie firmada (`HttpOnly`, `SameSite=Lax`, `Secure` en producción) y límite de intentos.
- **Control de acceso**: `proxy.ts` protege todo el portal; `/admin` exige rol administrador (verificado otra vez en el servidor).
- **API autenticada**: `Authorization: Bearer <api key>` o la sesión del navegador, con protección CSRF, validación estricta y 120 peticiones/minuto por usuario.
- **Cartera y pedidos**: el dinero se guarda en enteros (micro-dólares); cada pedido descuenta saldo, cada cancelación lo devuelve y todo queda en el libro mayor.
- **Idempotencia aplicada**: repetir un pedido con la misma `Idempotency-Key` no cobra dos veces.

## Límites actuales

- **Los datos viven en memoria** (`lib/store.ts`) y se pierden al reiniciar. Para producción falta un adaptador PostgreSQL con los mismos métodos; el esquema está en `database/`.
- **No hay proveedor ni pasarela de pago conectados.** Los pedidos avanzan con un ciclo simulado (en cola → procesando → completado) y los depósitos solo existen en modo demo.
- Las pantallas de tickets, afiliados, paneles secundarios y las tablas de administración siguen mostrando datos de ejemplo.

## Puesta en marcha

```powershell
npm install
copy .env.example .env.local
npm run dev -- --port 3004
```

En modo demo (por defecto fuera de producción) existen dos cuentas:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@classroom.local` | `DemoAdmin123!` |
| Cliente | `student@classroom.local` | `DemoUser123!` |

En producción define `SESSION_SECRET` (obligatorio) y `ADMIN_EMAIL` / `ADMIN_PASSWORD`; las cuentas demo no se crean salvo `DEMO_MODE=true`.

## Validación

```powershell
npm run validate
```

Ejecuta, en orden: TypeScript, ESLint, pruebas unitarias, build de producción y pruebas de extremo a extremo contra el build. Ver `TESTING.md`.
