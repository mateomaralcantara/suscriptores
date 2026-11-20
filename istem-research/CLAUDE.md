# CLAUDE.md · ISTEM RESEARCH

Aplicación independiente dentro de `istem-research/` (no comparte código ni base de datos con la app de la raíz).

## Comandos (desde `istem-research/`)
`npm ci` · `npm run dev` · `npm run validate` · `npm run test:db` (requiere `DATABASE_URL` de un Postgres desechable).
Antes de terminar un cambio: `npm run validate`, y `npm run test:db` si tocas SQL.

## Reglas
- La app consulta Supabase **con el token del usuario** (`lib/supabase.ts`). No uses la service role en rutas ni páginas (lo comprueba `tests/e2e`).
- Toda escritura es una RPC `security definer` que comprueba permisos (`require_permission`) y llama `write_audit` en la misma transacción.
- Toda tabla nueva: RLS habilitada, `revoke` a anon/authenticated, solo `select` con política. Errores de negocio con SQLSTATE `PTxxx`.
- En PL/pgSQL, califica columnas. Migraciones idempotentes (se aplican dos veces en las pruebas).
- `lib/methodology.ts`, `lib/simulator.ts`, `lib/project-rules.ts`, `lib/modules.ts`: puros, sin alias; las pruebas los importan directamente.
- `lib/project-rules.ts` debe coincidir con las restricciones SQL (hay prueba).
- Nunca calcules ni muestres margen de error para diseños no probabilísticos.
- Sin datos de ejemplo ni conexiones simuladas: un módulo sin backend muestra su fase. Datos de prueba siempre rotulados como ficticios.
- Textos visibles en español.
