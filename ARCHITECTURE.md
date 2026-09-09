# Arquitectura

- `app/`: rutas públicas, portal, administración y API.
- `components/`: shell, navegación, tablas, formularios y tarjetas.
- `lib/`: tipos, formato, respuestas API y datos demo centralizados.
- `database/`: migración PostgreSQL, RLS y seed.
- `scripts/`: instalación, build, pruebas y validación PowerShell.

La interfaz usa componentes de servidor por defecto. Los formularios y el selector de tema son componentes cliente. La API está aislada en `/api/v1` y siempre marca `mode: sandbox`.
