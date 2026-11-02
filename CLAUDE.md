# CLAUDE.md

Guía para Claude Code (y cualquier colaborador) al trabajar en este repositorio.

## Proyecto

**Growth Reseller Lab**: panel sandbox en Next.js 16 (App Router) + React 19 + TypeScript estricto.
Todo funciona con datos de demostración; **no hay proveedores reales activados**. Mantén ese
comportamiento: cualquier integración real debe ir detrás de configuración explícita y revisión.

## Comandos

```bash
npm ci              # instalar (Node >= 22.18)
npm run dev         # servidor de desarrollo (webpack)
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint (eslint-config-next)
npm test            # unit + integration + e2e (node --test)
npm run test:api    # pruebas HTTP contra el build (requiere npm run build)
npm run build       # build de producción
npm run validate    # todo lo anterior en orden
```

Antes de dar por terminado un cambio, `npm run validate` debe pasar.

## Estructura

- `app/(portal)/*` – páginas del portal de usuario y `admin/*`.
- `app/api/*` – API REST sandbox (`v1/services`, `v1/orders`, `v1/orders/bulk`, pagos, webhooks…).
- `components/` – componentes React. `NewOrderPanel.tsx` es el formulario de `/orders/new`.
- `lib/order-services.ts` – catálogo único de servicios usado por la UI y por `/api/v1/services` y `/api/v1/orders`.
- `lib/order-rules.ts` – reglas puras de pedidos (`calculateCharge`, `validateOrder`). Precio = `rate` por cada 1000 unidades.
- `lib/api.ts` – helpers de respuesta (`json`, `apiError`, `readJsonObject`).
- `lib/demo-data.ts` – datos ficticios para tablas y paneles.
- `lib/providers/smm-panel.ts` – cliente de proveedor externo **sin uso**; no conectarlo sin aprobación.
- `database/` – migraciones SQL y políticas RLS de referencia.
- `proxy.ts` – proxy (antes "middleware") de Next 16.

## Convenciones

- Imports con alias `@/`, excepto en `lib/order-rules.ts` y `lib/order-services.ts`, que las pruebas
  importan directamente con `node --test` (solo `import type` relativos, sin alias).
- La validación vive en `lib/order-rules.ts` y se reutiliza en cliente y servidor; no dupliques reglas.
- Las rutas de API devuelven `400` para JSON inválido y `422` con `details` por campo para errores de validación.
- Textos visibles al usuario en español.
- Pruebas: añade casos en `tests/unit` (lógica pura), `tests/integration` (catálogo/flujo), `tests/e2e` (rutas) y `tests/api` (HTTP real contra el build).
- Un id inexistente devuelve `404` (API y páginas de detalle); nunca uses el primer elemento como fallback.
