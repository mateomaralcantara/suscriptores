# Validation report

Fecha: 2026-11-11 · Comando: `npm run validate`

- TypeScript: aprobado (`npm run typecheck`)
- ESLint: sin errores ni avisos (`npm run lint`)
- Pruebas unitarias: 39/39 (`npm run test:unit`)
- Build Next.js 16.4.6: aprobado (`npm run build`)
- Pruebas de extremo a extremo contra el build: 19/19 (`npm run test:e2e`)
- `npm audit --omit=dev`: 0 vulnerabilidades. Quedan 8 avisos moderados en herramientas de desarrollo (cadena de ESLint), que no se despliegan.

El proyecto se entrega sin `node_modules` ni `.next`; se generan con `npm install` y `npm run build`.
