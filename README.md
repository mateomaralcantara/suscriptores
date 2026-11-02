# Suscriptores — Growth Reseller Lab

Panel Next.js 16 con autenticación y cartera en Supabase, catálogo y pedidos conectados a un proveedor SMM, administración y API REST autenticada.

## Cambio principal de esta entrega

La ruta `/orders/new` incluye ahora un panel profesional con:

- pestañas por plataforma;
- búsqueda y filtro por categoría;
- selector de servicios con ID, calidad, velocidad, refill y precio;
- descripción automática;
- mínimo y máximo dinámicos;
- tiempo promedio;
- cálculo automático del cargo;
- validación y envío al proveedor (si `SMM_LIVE_ORDERS_ENABLED=true`);
- endpoint `/api/v1/services` usando el mismo catálogo.

## Configuración

1. Copia `.env.example` a `.env.local` y completa Supabase y el proveedor.
2. Aplica en Supabase (SQL editor), en orden: `database/migrations/001_initial.sql`, `002_live_core.sql`, `database/rls.sql` y `003_order_settlement.sql`.
   **`003` es obligatoria:** corrige `reserve_smm_order` (sin ella todos los pedidos fallan) y añade los reembolsos por cancelación y entrega parcial.
3. Activa los pedidos reales con `SMM_LIVE_ORDERS_ENABLED=true` solo cuando lo anterior esté listo.

## Instalación limpia en Windows

```powershell
npm install
npm run dev -- --port 3004
```

Abrir: `http://localhost:3004/orders/new`

## Validación

```powershell
npm run validate   # typecheck + lint + pruebas + build + pruebas HTTP
```

Pruebas de base de datos (necesitan un PostgreSQL desechable; en CI se ejecutan solas):

```powershell
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres"; npm run test:db
```

## Claude Code

El repositorio incluye `CLAUDE.md` y `.github/workflows/claude.yml`. Para activarlo:

1. Instala la app de GitHub de Claude: https://github.com/apps/claude
2. Añade el secreto `CLAUDE_CODE_OAUTH_TOKEN` (genéralo con `claude setup-token`) o `ANTHROPIC_API_KEY` en *Settings → Secrets and variables → Actions*.
3. Menciona `@claude` en un issue o comentario de PR.
