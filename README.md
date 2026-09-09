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
npm test
npm run build
```

Resultados de esta entrega: TypeScript correcto, 45 pruebas aprobadas y 45 páginas compiladas.
