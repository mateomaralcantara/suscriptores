# CLAUDE.md

Guía para Claude Code (y cualquier colaborador) al trabajar en este repositorio.

## Proyecto

**Suscriptores / Growth Reseller Lab**: panel de pedidos en Next.js 16 (App Router) + React 19 +
TypeScript estricto, con autenticación y datos en **Supabase** (REST/RPC, sin SDK) y un proveedor
SMM externo. Maneja **dinero real** (cartera en centavos): cualquier cambio en pedidos, saldo o
reembolsos debe pasar por funciones SQL atómicas y tener pruebas en `tests/db`.

Los pedidos reales solo se envían si `SMM_LIVE_ORDERS_ENABLED=true`. Ver `.env.example`.

## Comandos

```bash
npm ci              # instalar (Node >= 22.18)
npm run dev         # servidor de desarrollo (webpack)
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint (eslint-config-next)
npm test            # unit + integration + e2e (node --test, sin red)
npm run build       # build de producción
npm run test:api    # pruebas HTTP contra el build (requiere build)
npm run test:db     # migraciones + pruebas SQL (requiere DATABASE_URL de un Postgres desechable)
npm run validate    # typecheck, lint, test, build y test:api
```

Antes de dar por terminado un cambio, `npm run validate` debe pasar (y `npm run test:db` si tocas SQL).

## Estructura

- `app/(portal)/*` – portal; `proxy.ts` redirige a `/login` sin cookie de sesión.
- `app/(portal)/admin/*` – admin. Protegido por `requireAdmin()` en el layout **y** en cada página que lea datos privilegiados.
- `app/api/auth/*` – login, registro, logout, recuperación (cookies httpOnly `gr_access_token` / `gr_refresh_token`).
- `app/api/v1/*` – API autenticada: servicios, pedidos, cancelación, refill, saldo, transacciones.
- `lib/supabase-server.ts` – cliente Supabase (auth + REST con service role), `isAdminUser`, `requireAdmin`.
- `lib/providers/smm-panel.ts` – adaptador del proveedor (`SmmPanelError.ambiguous` = no se sabe si el pedido se creó).
- `lib/order-status.ts` – reglas puras: estados, cancel/refill, reembolsos, margen y coste en centavos.
- `lib/api.ts` – `json`, `readJsonObject`, `internalError` (registra el error y responde genérico).
- `database/migrations/` – `001` esquema, `002` núcleo en vivo, `003` liquidación/reembolsos (+ corrección de `reserve_smm_order`).

## Flujo de dinero

1. `reserve_smm_order` – mueve el coste de `available` a `reserved` (idempotente por `idempotencyKey`).
2. Proveedor acepta → `confirm_smm_order` (débito en ledger). Rechaza → `fail_smm_order` (devuelve la reserva).
   Respuesta ambigua → `mark_smm_order_unknown` (queda reservado hasta conciliar).
3. `apply_provider_status` – aplica el estado del proveedor; `canceled` reembolsa todo y `partial` la parte no entregada, una sola vez.
4. `request_order_cancel` – marca `cancel_requested`; el reembolso llega cuando el proveedor confirma `canceled`.

## Convenciones

- Nunca devuelvas mensajes internos (Supabase, proveedor) en un 500: usa `internalError`.
- Las funciones SQL de dinero son `security definer`, con `set search_path = public`, `revoke` a `anon/authenticated` y `grant` a `service_role` (lo verifica `tests/integration`).
- En PL/pgSQL con `returns table(...)`, califica las columnas (`orders.status`): los nombres de salida chocan con las columnas.
- Admin = correo en `ADMIN_EMAILS` **y** confirmado (`isAdminUser`), nunca solo el correo.
- `lib/order-status.ts` y `lib/order-services.ts` no usan alias ni imports de runtime: las pruebas los importan directamente.
- Textos visibles al usuario en español.
