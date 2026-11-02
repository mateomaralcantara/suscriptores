# Growth Reseller Lab — panel completo sandbox

Proyecto Next.js 16 con panel de pedidos, servicios, cartera, tickets, afiliados, paneles secundarios, administración y API REST sandbox.

## Cambio principal de esta entrega

La ruta `/orders/new` incluye ahora un panel profesional con:

- pestañas por plataforma;
- búsqueda y filtro por categoría;
- selector de servicios con ID, calidad, velocidad, refill y precio;
- descripción automática;
- mínimo y máximo dinámicos;
- tiempo promedio;
- cálculo automático del cargo;
- validación y envío sandbox;
- endpoint `/api/v1/services` usando el mismo catálogo.

El panel está listo para consumir una API aprobada, pero no activa proveedores reales ni compra interacción artificial.

## Instalación limpia en Windows

```powershell
npm install
npm run dev -- --port 3004
```

Abrir: `http://localhost:3004/orders/new`

## Validación

```powershell
npm run typecheck
npm run lint
npm test
npm run build
# o todo junto
npm run validate
```

La CI de GitHub Actions (`.github/workflows/ci.yml`) ejecuta estos pasos y `npm audit` en cada PR.

## Claude Code

El repositorio incluye `CLAUDE.md` y `.github/workflows/claude.yml`. Para activarlo:

1. Instala la app de GitHub de Claude en el repositorio: https://github.com/apps/claude
2. Añade el secreto `CLAUDE_CODE_OAUTH_TOKEN` (genéralo con `claude setup-token`) o `ANTHROPIC_API_KEY` en *Settings → Secrets and variables → Actions*.
3. Menciona `@claude` en un issue o comentario de PR.
